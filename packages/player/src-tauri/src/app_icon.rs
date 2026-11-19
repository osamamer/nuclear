use std::fs;
use std::path::{Path, PathBuf};

use tauri::{image::Image, AppHandle, Manager, State};

use crate::light_profile::CurrentProfile;

const ICON_NAME: &str = "nuclear-music-player";
const ICON_SIZE_DIR: &str = "512x512";

fn user_icon_path(data_home: &Path) -> PathBuf {
    data_home
        .join("icons")
        .join("hicolor")
        .join(ICON_SIZE_DIR)
        .join("apps")
        .join(format!("{ICON_NAME}.png"))
}

fn data_home() -> Option<PathBuf> {
    std::env::var_os("XDG_DATA_HOME")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".local/share")))
}

pub fn write_icon_if_changed(path: &Path, png: &[u8]) -> Result<bool, String> {
    if fs::read(path).ok().as_deref() == Some(png) {
        return Ok(false);
    }
    let parent = path.parent().ok_or("icon path has no parent")?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = parent.join(format!(".{ICON_NAME}.png.tmp"));
    fs::write(&temporary, png).map_err(|error| error.to_string())?;
    fs::rename(&temporary, path).map_err(|error| error.to_string())?;
    Ok(true)
}

fn install_user_icon(png: &[u8]) -> Result<(), String> {
    let Some(data_home) = data_home() else {
        return Ok(());
    };
    if write_icon_if_changed(&user_icon_path(&data_home), png)? {
        let theme_dir = data_home.join("icons").join("hicolor");
        let _ = fs::File::open(&theme_dir).and_then(|dir| dir.set_modified(std::time::SystemTime::now()));
        log::info!("Updated desktop icon to match accent color");
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_app_icon(
    app: AppHandle,
    profile: State<'_, CurrentProfile>,
    png: Vec<u8>,
) -> Result<(), String> {
    let image = Image::from_bytes(&png).map_err(|error| error.to_string())?;
    for window in app.webview_windows().values() {
        if let Err(error) = window.set_icon(image.clone()) {
            log::warn!("Failed to set window icon: {error}");
        }
    }

    let is_flatpak = std::env::var("FLATPAK_ID").is_ok();
    if cfg!(target_os = "linux") && profile.name.is_none() && !is_flatpak {
        install_user_icon(&png)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_icon_into_hicolor_theme_and_skips_identical_content() {
        let directory = tempfile::tempdir().unwrap();
        let path = user_icon_path(directory.path());

        assert!(write_icon_if_changed(&path, b"first").unwrap());
        assert!(!write_icon_if_changed(&path, b"first").unwrap());
        assert!(write_icon_if_changed(&path, b"second").unwrap());

        assert_eq!(fs::read(&path).unwrap(), b"second");
        assert!(path.ends_with("icons/hicolor/512x512/apps/nuclear-music-player.png"));
    }
}
