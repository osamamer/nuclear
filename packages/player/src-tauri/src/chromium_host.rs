use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use tauri::{App, Manager, WebviewUrl};

pub fn enabled() -> bool {
    std::env::var_os("NUCLEAR_CHROMIUM_HOST").is_some_and(|mode| mode == "stdio")
}

pub fn configure(context: &mut tauri::Context<tauri::Wry>) {
    if let Some(window) = context
        .config_mut()
        .app
        .windows
        .iter_mut()
        .find(|window| window.label == "main")
    {
        window.url = WebviewUrl::App("nuclear-chromium-host.html".into());
        window.visible = false;
        window.skip_taskbar = true;
    }
}

#[tauri::command]
pub fn chromium_host_message(message: Value) -> Result<(), String> {
    if !enabled() {
        return Err("The Chromium host is not running".into());
    }
    write_message(&message).map_err(|error| error.to_string())
}

fn write_message(message: &Value) -> io::Result<()> {
    let mut output = io::stdout().lock();
    writeln!(output, "{message}")?;
    output.flush()
}

pub fn read_requests(app: &App) {
    let app = app.handle().clone();
    std::thread::spawn(move || {
        for line in io::stdin().lock().lines().map_while(Result::ok) {
            let Ok(request) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            let Some(webview) = app.get_webview_window("main") else {
                break;
            };
            let script = format!("globalThis.nuclearChromiumDispatch({request})");
            if let Err(error) = webview.eval(script) {
                let _ = write_message(&json!({"id": request["id"], "error": error.to_string()}));
            }
        }
        app.exit(0);
    });
}
