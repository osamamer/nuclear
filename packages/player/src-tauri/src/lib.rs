pub mod ai;
pub mod app_icon;
pub mod bridge;
#[cfg(target_os = "linux")]
mod chromium_host;
pub mod commands;
pub mod db;
pub mod discord;
pub mod downloads;
pub mod history;
pub mod http;
pub mod http_api;
pub mod light_profile;
pub mod logging;
pub mod mcp;
pub mod mpd;
pub mod net;
pub mod pagination;
pub mod profile;
mod setup;
pub mod stream_server;
pub mod ytdlp;
pub mod ytdlp_setup;
pub mod ytdlp_verify;
#[cfg(target_os = "linux")]
mod webkit_tuning;

// Maximizes the window when running as a non-steam app in steam
#[cfg(target_os = "linux")]
fn maximize_for_gamescope(app: &tauri::App) {
    use tauri::Manager;

    let is_gamescope = std::env::var("GAMESCOPE_WAYLAND_DISPLAY").is_ok()
        || std::env::var("SteamDeck").map_or(false, |v| v == "1");

    if is_gamescope {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.maximize();
        }
    }
}

const WINDOW_SHOW_FALLBACK_DELAY: std::time::Duration = std::time::Duration::from_secs(8);

fn show_main_window_if_frontend_stalls(app: &tauri::App) {
    use tauri::Manager;

    let handle = app.handle().clone();
    std::thread::spawn(move || {
        std::thread::sleep(WINDOW_SHOW_FALLBACK_DELAY);
        let Some(window) = handle.get_webview_window("main") else {
            return;
        };
        let is_visible = window.is_visible().unwrap_or(true);
        let is_minimized = window.is_minimized().unwrap_or(false);
        if !is_visible && !is_minimized {
            log::warn!("Frontend did not show the main window in time, showing it from the backend");
            let _ = window.show();
            let _ = window.set_focus();
        }
    });
}

fn typescript_export_config() -> specta_typescript::Typescript {
    specta_typescript::Typescript::default().header("/* eslint-disable */")
}

fn specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new().commands(tauri_specta::collect_commands![
        commands::is_flatpak,
        commands::copy_dir_recursive,
        commands::extract_zip,
        commands::download_file,
        downloads::download_track,
        downloads::track_file_exists,
        commands::sha256_file,
        http::http_fetch,
        ytdlp::ytdlp_search,
        ytdlp::ytdlp_get_stream,
        ytdlp::ytdlp_get_playlist,
        logging::get_startup_logs,
        mcp::mcp_start,
        mcp::mcp_stop,
        http_api::http_api_start,
        http_api::http_api_stop,
        mpd::mpd_start,
        mpd::mpd_stop,
        stream_server::stream_server_port,
        ytdlp_setup::ytdlp_ensure_installed,
        discord::discord_connect,
        discord::discord_disconnect,
        discord::discord_set_activity,
        discord::discord_clear_activity,
        bridge::bridge_respond,
        bridge::bridge_notify,
        history::commands::history_record_event,
        history::commands::history_fetch,
        history::commands::history_delete_range,
        history::commands::history_hourly_listening_time,
        history::commands::history_daily_listening_time,
        history::commands::history_first_play_at,
        history::commands::history_top_artists,
        history::commands::history_top_albums,
        history::commands::history_top_tracks,
        light_profile::light_profile_active,
        light_profile::light_profiles_list,
        light_profile::light_profiles_save,
        ai::ai_complete,
        ai::ai_detect_backends,
        app_icon::set_app_icon
    ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let is_flatpak = std::env::var("FLATPAK_ID").is_ok();

    let profile = profile::parse_profile(std::env::args()).unwrap_or_else(|message| {
        eprintln!("{message}");
        std::process::exit(1);
    });

    let mut context: tauri::Context<tauri::Wry> = tauri::generate_context!();
    let default_identifier = context.config().identifier.clone();
    if let Some(name) = &profile {
        context.config_mut().identifier = profile::profile_identifier(&default_identifier, name);
    }

    #[cfg(target_os = "linux")]
    let chromium = chromium_host::enabled();
    #[cfg(not(target_os = "linux"))]
    let chromium = false;

    #[cfg(target_os = "linux")]
    if chromium {
        chromium_host::configure(&mut context);
    }

    let specta_builder = specta_builder();

    #[cfg(debug_assertions)]
    specta_builder
        .export(
            typescript_export_config(),
            concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../src/services/tauri/bindings.ts"
            ),
        )
        .expect("failed to export typescript bindings");

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_upload::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::all()
                        .difference(tauri_plugin_window_state::StateFlags::VISIBLE),
                )
                .build(),
        )
        .plugin(setup::log_plugin(chromium));

    if !is_flatpak {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    let invoke_commands = specta_builder.invoke_handler();
    #[cfg(target_os = "linux")]
    let invoke_chromium: fn(tauri::ipc::Invoke<tauri::Wry>) -> bool =
        tauri::generate_handler![chromium_host::chromium_host_message];

    builder
        .invoke_handler(move |invoke| {
            #[cfg(target_os = "linux")]
            if invoke.message.command() == "chromium_host_message" {
                return invoke_chromium(invoke);
            }
            invoke_commands(invoke)
        })
        .manage(profile::DefaultIdentifier(default_identifier))
        .manage(light_profile::CurrentProfile::new(profile.clone()))
        .setup(move |app| {
            if let Some(name) = &profile {
                log::info!("Using profile {name}");
            }
            logging::mark_startup_complete();
            bridge::init_bridge(app.handle().clone());
            mcp::init_mcp(app.handle().clone());
            mpd::init_mpd(app.handle().clone());
            http_api::init_http_api(app.handle().clone());
            stream_server::init_stream_server(app.handle().clone());
            discord::init_discord(app.handle().clone());
            history::init_history(app.handle().clone());

            #[cfg(target_os = "linux")]
            if chromium {
                chromium_host::read_requests(app);
                return Ok(());
            }

            #[cfg(target_os = "linux")]
            maximize_for_gamescope(app);

            #[cfg(target_os = "linux")]
            webkit_tuning::tune_main_webview(app);

            show_main_window_if_frontend_stalls(app);

            Ok(())
        })
        .run(context)
        .expect("error while running tauri application");
}
