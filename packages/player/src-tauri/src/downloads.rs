use futures::StreamExt;
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tauri::{command, AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

const DOWNLOAD_EVENT: &str = "playlist-download:progress";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    track_key: String,
    status: &'static str,
    downloaded_bytes: u64,
    total_bytes: Option<u64>,
}

pub fn validate_track_filename(file_name: &str) -> bool {
    let Some((digest, extension)) = file_name.split_once('.') else {
        return false;
    };

    digest.len() == 64
        && digest.bytes().all(|byte| byte.is_ascii_hexdigit())
        && matches!(
            extension,
            "aac" | "flac" | "m4a" | "mp3" | "ogg" | "opus" | "wav" | "webm"
        )
}

fn download_directory(app_handle: &AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map(|path| path.join("downloads"))
        .map_err(|error| format!("Failed to find downloads directory: {error}"))
}

fn filename_for_track(track_key: &str, container: &str) -> Result<String, String> {
    let normalized_container = container.to_ascii_lowercase();
    let extension = match normalized_container.as_str() {
        "aac" => "aac",
        "flac" => "flac",
        "m4a" => "m4a",
        "mp3" => "mp3",
        "ogg" => "ogg",
        "opus" => "opus",
        "wav" => "wav",
        "webm" => "webm",
        _ => return Err(format!("Unsupported audio format: {container}")),
    };
    let digest = Sha256::digest(track_key.as_bytes());
    let digest = digest
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    Ok(format!("{digest}.{extension}"))
}

#[command]
#[specta::specta]
pub async fn download_track(
    app_handle: AppHandle,
    url: String,
    track_key: String,
    container: String,
) -> Result<String, String> {
    let parsed_url = reqwest::Url::parse(&url).map_err(|error| error.to_string())?;
    if parsed_url.scheme() != "http" && parsed_url.scheme() != "https" {
        return Err("Track downloads require an HTTP or HTTPS stream".to_string());
    }

    let file_name = filename_for_track(&track_key, &container)?;
    let directory = download_directory(&app_handle)?;
    tokio::fs::create_dir_all(&directory)
        .await
        .map_err(|error| format!("Failed to create downloads directory: {error}"))?;

    let destination = directory.join(&file_name);
    if tokio::fs::metadata(&destination).await.is_ok() {
        return Ok(file_name);
    }

    let temporary = directory.join(format!("{file_name}.{}.part", uuid::Uuid::new_v4()));
    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(std::time::Duration::from_secs(1800))
        .connect_timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?;

    let result = async {
        let response = client
            .get(parsed_url)
            .send()
            .await
            .map_err(|error| format!("Failed to download track: {error}"))?
            .error_for_status()
            .map_err(|error| format!("Track source returned an error: {error}"))?;
        let total_bytes = response.content_length();
        let mut downloaded_bytes = 0;
        let mut file = tokio::fs::File::create(&temporary)
            .await
            .map_err(|error| format!("Failed to create downloaded track: {error}"))?;

        app_handle
            .emit(
                DOWNLOAD_EVENT,
                DownloadProgress {
                    track_key: track_key.clone(),
                    status: "progress",
                    downloaded_bytes,
                    total_bytes,
                },
            )
            .ok();

        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|error| format!("Track download failed: {error}"))?;
            file.write_all(&chunk)
                .await
                .map_err(|error| format!("Failed to write downloaded track: {error}"))?;
            downloaded_bytes += chunk.len() as u64;
            app_handle
                .emit(
                    DOWNLOAD_EVENT,
                    DownloadProgress {
                        track_key: track_key.clone(),
                        status: "progress",
                        downloaded_bytes,
                        total_bytes,
                    },
                )
                .ok();
        }

        if downloaded_bytes == 0 {
            return Err("The track source returned an empty file".to_string());
        }

        file.flush()
            .await
            .map_err(|error| format!("Failed to finish downloaded track: {error}"))?;
        drop(file);
        if let Err(error) = tokio::fs::rename(&temporary, &destination).await {
            if tokio::fs::metadata(&destination).await.is_ok() {
                let _ = tokio::fs::remove_file(&temporary).await;
            } else {
                return Err(format!("Failed to save downloaded track: {error}"));
            }
        }
        Ok::<(), String>(())
    }
    .await;

    if let Err(error) = result {
        let _ = tokio::fs::remove_file(&temporary).await;
        app_handle
            .emit(
                DOWNLOAD_EVENT,
                DownloadProgress {
                    track_key,
                    status: "failed",
                    downloaded_bytes: 0,
                    total_bytes: None,
                },
            )
            .ok();
        return Err(error);
    }

    Ok(file_name)
}

#[command]
#[specta::specta]
pub async fn track_file_exists(app_handle: AppHandle, file_name: String) -> Result<bool, String> {
    if !validate_track_filename(&file_name) {
        return Ok(false);
    }

    let path = download_directory(&app_handle)?.join(file_name);
    Ok(tokio::fs::metadata(path)
        .await
        .map(|metadata| metadata.is_file())
        .unwrap_or(false))
}
