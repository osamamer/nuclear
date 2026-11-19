use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

const ANTHROPIC_MESSAGES_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2026-10-21";
const ANTHROPIC_FALLBACK_BETA: &str = "server-side-fallback-2026-07-01";
const DEFAULT_ANTHROPIC_MODEL: &str = "claude-opus-5-5";
const CLI_TIMEOUT: Duration = Duration::from_secs(180);
const API_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Deserialize, Serialize, Clone, Copy, Debug, PartialEq, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum AiBackend {
    ClaudeCli,
    CodexCli,
    AnthropicApi,
}

#[derive(Deserialize, Serialize, Clone, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AiRequest {
    pub backend: AiBackend,
    pub system: String,
    pub prompt: String,
    pub json_schema: Option<String>,
    pub api_key: Option<String>,
    pub model: Option<String>,
}

#[derive(Serialize, Clone, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AiAvailability {
    pub claude_cli: bool,
    pub codex_cli: bool,
}

fn candidate_dirs() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = std::env::var_os("PATH")
        .map(|path| std::env::split_paths(&path).collect())
        .unwrap_or_default();

    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from);
    if let Some(home) = home {
        for relative in [
            ".local/bin",
            ".claude/local",
            ".npm-global/bin",
            ".bun/bin",
            ".volta/bin",
            ".cargo/bin",
            "bin",
        ] {
            dirs.push(home.join(relative));
        }
        if let Ok(entries) = std::fs::read_dir(home.join(".nvm/versions/node")) {
            for entry in entries.flatten() {
                dirs.push(entry.path().join("bin"));
            }
        }
    }
    dirs.push(PathBuf::from("/usr/local/bin"));
    dirs.push(PathBuf::from("/opt/homebrew/bin"));
    dirs
}

fn is_executable(path: &Path) -> bool {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        path.metadata()
            .map(|meta| meta.is_file() && meta.permissions().mode() & 0o111 != 0)
            .unwrap_or(false)
    }
    #[cfg(not(unix))]
    {
        path.is_file()
    }
}

fn find_executable(name: &str) -> Option<PathBuf> {
    let names: Vec<String> = if cfg!(windows) {
        vec![format!("{name}.exe"), format!("{name}.cmd"), name.to_string()]
    } else {
        vec![name.to_string()]
    };
    candidate_dirs().into_iter().find_map(|dir| {
        names
            .iter()
            .map(|candidate| dir.join(candidate))
            .find(|path| is_executable(path))
    })
}

fn search_path_env(executable: &Path) -> std::ffi::OsString {
    let mut dirs = candidate_dirs();
    if let Some(parent) = executable.parent() {
        dirs.insert(0, parent.to_path_buf());
    }
    std::env::join_paths(dirs).unwrap_or_default()
}

async fn run_cli(mut command: Command, stdin_text: &str) -> Result<String, String> {
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(std::env::temp_dir())
        .kill_on_drop(true);

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to start AI CLI: {error}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(stdin_text.as_bytes())
            .await
            .map_err(|error| format!("Failed to write prompt: {error}"))?;
    }

    let output = tokio::time::timeout(CLI_TIMEOUT, child.wait_with_output())
        .await
        .map_err(|_| "The AI assistant took too long to answer".to_string())?
        .map_err(|error| format!("AI CLI failed: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let detail = if stderr.trim().is_empty() { stdout } else { stderr };
        return Err(format!(
            "AI CLI exited with {}: {}",
            output.status,
            detail.trim().chars().take(600).collect::<String>()
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn schema_instruction(json_schema: &Option<String>) -> String {
    match json_schema {
        Some(schema) => format!(
            "\n\nRespond with a single JSON object only, no prose and no code fences. It must match this JSON schema:\n{schema}"
        ),
        None => String::new(),
    }
}

async fn complete_with_claude_cli(request: &AiRequest) -> Result<String, String> {
    let executable = find_executable("claude")
        .ok_or_else(|| "Claude Code CLI (claude) was not found on this system".to_string())?;
    let system = format!("{}{}", request.system, schema_instruction(&request.json_schema));

    let mut command = Command::new(&executable);
    command
        .env("PATH", search_path_env(&executable))
        .arg("-p")
        .arg("--output-format")
        .arg("text")
        .arg("--append-system-prompt")
        .arg(system);
    if let Some(model) = request.model.as_ref().filter(|model| !model.trim().is_empty()) {
        command.arg("--model").arg(model);
    }
    run_cli(command, &request.prompt).await
}

async fn complete_with_codex_cli(request: &AiRequest) -> Result<String, String> {
    let executable = find_executable("codex")
        .ok_or_else(|| "Codex CLI (codex) was not found on this system".to_string())?;
    let output_file =
        std::env::temp_dir().join(format!("nuclear-codex-{}.txt", uuid::Uuid::new_v4()));
    let prompt = format!(
        "{}{}\n\n---\n\n{}",
        request.system,
        schema_instruction(&request.json_schema),
        request.prompt
    );

    let mut command = Command::new(&executable);
    command
        .env("PATH", search_path_env(&executable))
        .arg("exec")
        .arg("--ignore-user-config")
        .arg("--skip-git-repo-check")
        .arg("--sandbox")
        .arg("read-only")
        .arg("--ephemeral")
        .arg("--output-last-message")
        .arg(&output_file);
    if let Some(model) = request.model.as_ref().filter(|model| !model.trim().is_empty()) {
        command.arg("--model").arg(model);
    }
    command.arg("-");

    let stdout = run_cli(command, &prompt).await;
    let last_message = tokio::fs::read_to_string(&output_file).await.ok();
    let _ = tokio::fs::remove_file(&output_file).await;
    let stdout = stdout?;
    Ok(last_message
        .map(|message| message.trim().to_string())
        .filter(|message| !message.is_empty())
        .unwrap_or(stdout))
}

#[derive(Deserialize)]
struct AnthropicContentBlock {
    #[serde(rename = "type")]
    kind: String,
    text: Option<String>,
}

#[derive(Deserialize)]
struct AnthropicStopDetails {
    explanation: Option<String>,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContentBlock>,
    stop_reason: Option<String>,
    stop_details: Option<AnthropicStopDetails>,
}

#[derive(Deserialize)]
struct AnthropicErrorBody {
    error: AnthropicErrorDetail,
}

#[derive(Deserialize)]
struct AnthropicErrorDetail {
    message: String,
}

fn anthropic_body(request: &AiRequest) -> Result<serde_json::Value, String> {
    let model = request
        .model
        .as_ref()
        .filter(|model| !model.trim().is_empty())
        .cloned()
        .unwrap_or_else(|| DEFAULT_ANTHROPIC_MODEL.to_string());

    let mut output_config = serde_json::json!({ "effort": "low" });
    if let Some(schema) = &request.json_schema {
        let parsed: serde_json::Value = serde_json::from_str(schema)
            .map_err(|error| format!("Invalid JSON schema: {error}"))?;
        output_config["format"] = serde_json::json!({ "type": "json_schema", "schema": parsed });
    }

    Ok(serde_json::json!({
        "model": model,
        "max_tokens": 16000,
        "system": request.system,
        "messages": [{ "role": "user", "content": request.prompt }],
        "output_config": output_config,
        "fallbacks": "default",
    }))
}

fn anthropic_text(response: AnthropicResponse) -> Result<String, String> {
    if response.stop_reason.as_deref() == Some("refusal") {
        let explanation = response
            .stop_details
            .and_then(|details| details.explanation)
            .unwrap_or_else(|| "The request was declined".to_string());
        return Err(explanation);
    }
    let text: String = response
        .content
        .into_iter()
        .filter(|block| block.kind == "text")
        .filter_map(|block| block.text)
        .collect::<Vec<_>>()
        .join("");
    if text.trim().is_empty() {
        return Err("Claude returned an empty answer".to_string());
    }
    Ok(text)
}

async fn complete_with_anthropic_api(request: &AiRequest) -> Result<String, String> {
    let api_key = request
        .api_key
        .as_ref()
        .filter(|key| !key.trim().is_empty())
        .ok_or_else(|| "No Anthropic API key configured".to_string())?;
    let body = anthropic_body(request)?;

    let response = reqwest::Client::new()
        .post(ANTHROPIC_MESSAGES_URL)
        .timeout(API_TIMEOUT)
        .header("content-type", "application/json")
        .header("x-api-key", api_key.trim())
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("anthropic-beta", ANTHROPIC_FALLBACK_BETA)
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("Failed to reach the Anthropic API: {error}"))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("Failed to read the Anthropic API response: {error}"))?;

    if !status.is_success() {
        let message = serde_json::from_str::<AnthropicErrorBody>(&text)
            .map(|body| body.error.message)
            .unwrap_or_else(|_| text.chars().take(400).collect());
        return Err(format!("Anthropic API error ({status}): {message}"));
    }

    let parsed: AnthropicResponse = serde_json::from_str(&text)
        .map_err(|error| format!("Unexpected Anthropic API response: {error}"))?;
    anthropic_text(parsed)
}

#[tauri::command]
#[specta::specta]
pub async fn ai_complete(request: AiRequest) -> Result<String, String> {
    match request.backend {
        AiBackend::ClaudeCli => complete_with_claude_cli(&request).await,
        AiBackend::CodexCli => complete_with_codex_cli(&request).await,
        AiBackend::AnthropicApi => complete_with_anthropic_api(&request).await,
    }
}

#[tauri::command]
#[specta::specta]
pub fn ai_detect_backends() -> AiAvailability {
    AiAvailability {
        claude_cli: find_executable("claude").is_some(),
        codex_cli: find_executable("codex").is_some(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(json_schema: Option<String>) -> AiRequest {
        AiRequest {
            backend: AiBackend::AnthropicApi,
            system: "system".to_string(),
            prompt: "prompt".to_string(),
            json_schema,
            api_key: Some("key".to_string()),
            model: None,
        }
    }

    #[test]
    fn anthropic_body_uses_default_model_and_schema() {
        let body = anthropic_body(&request(Some(r#"{"type":"object"}"#.to_string()))).unwrap();
        assert_eq!(body["model"], DEFAULT_ANTHROPIC_MODEL);
        assert_eq!(body["output_config"]["format"]["type"], "json_schema");
        assert_eq!(body["output_config"]["format"]["schema"]["type"], "object");
        assert_eq!(body["fallbacks"], "default");
    }

    #[test]
    fn anthropic_body_rejects_invalid_schema() {
        assert!(anthropic_body(&request(Some("not json".to_string()))).is_err());
    }

    #[test]
    fn anthropic_text_reports_refusals() {
        let response: AnthropicResponse = serde_json::from_str(
            r#"{"content":[],"stop_reason":"refusal","stop_details":{"explanation":"nope"}}"#,
        )
        .unwrap();
        assert_eq!(anthropic_text(response).unwrap_err(), "nope");
    }

    #[test]
    fn anthropic_text_joins_text_blocks() {
        let response: AnthropicResponse = serde_json::from_str(
            r#"{"content":[{"type":"thinking","thinking":""},{"type":"text","text":"{\"a\":"},{"type":"text","text":"1}"}],"stop_reason":"end_turn","stop_details":null}"#,
        )
        .unwrap();
        assert_eq!(anthropic_text(response).unwrap(), "{\"a\":1}");
    }
}
