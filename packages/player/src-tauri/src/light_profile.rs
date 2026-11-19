use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

use crate::profile::{is_safe_name, DefaultIdentifier};

const PROFILES_FILE: &str = "light-profiles.json";
const PLAYLISTS_DIR: &str = "playlists";
const MIRRORED_FILES: [&str; 5] = [
    "settings.json",
    "plugins.json",
    "active-providers.json",
    "blacklist.json",
    "shortcuts.json",
];
const MIRRORED_DIRS: [&str; 2] = ["plugins", "themes"];
const LAUNCHER_PREFIX: &str = "nuclear-profile-";
const CLARITARD_MARKER: &str = "X-Claritard-Timeout=true";

pub struct CurrentProfile {
    pub name: Option<String>,
    mirrored: Mutex<bool>,
}

impl CurrentProfile {
    pub fn new(name: Option<String>) -> Self {
        Self {
            name,
            mirrored: Mutex::new(false),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LightProfile {
    pub name: String,
    pub playlist_ids: Vec<String>,
}

#[derive(Serialize, Deserialize, Default)]
struct LightProfilesFile {
    profiles: Vec<LightProfile>,
}

#[derive(Serialize, Clone, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ActiveLightProfile {
    pub name: String,
    pub playlists_json: Vec<String>,
}

pub fn read_profiles(default_dir: &Path) -> Vec<LightProfile> {
    fs::read_to_string(default_dir.join(PROFILES_FILE))
        .ok()
        .and_then(|text| serde_json::from_str::<LightProfilesFile>(&text).ok())
        .map(|file| file.profiles)
        .unwrap_or_default()
}

pub fn write_profiles(default_dir: &Path, profiles: &[LightProfile]) -> Result<(), String> {
    let text = serde_json::to_string_pretty(&LightProfilesFile {
        profiles: profiles.to_vec(),
    })
    .map_err(|error| format!("Failed to serialize light profiles: {error}"))?;
    fs::create_dir_all(default_dir)
        .map_err(|error| format!("Failed to create data directory: {error}"))?;
    let temporary = default_dir.join(format!("{PROFILES_FILE}.tmp"));
    fs::write(&temporary, text)
        .and_then(|_| fs::rename(&temporary, default_dir.join(PROFILES_FILE)))
        .map_err(|error| format!("Failed to save light profiles: {error}"))
}

pub fn validate_profiles(profiles: &[LightProfile]) -> Result<(), String> {
    let mut seen = std::collections::HashSet::new();
    for profile in profiles {
        if !is_safe_name(&profile.name) {
            return Err(format!(
                "Invalid profile name \"{}\". Use only letters, digits, hyphens, and underscores.",
                profile.name
            ));
        }
        if !seen.insert(profile.name.to_lowercase()) {
            return Err(format!("Two light profiles are named \"{}\".", profile.name));
        }
    }
    Ok(())
}

pub fn read_playlists(default_dir: &Path, playlist_ids: &[String]) -> Vec<String> {
    playlist_ids
        .iter()
        .filter(|id| is_safe_name(id))
        .filter_map(|id| {
            let text =
                fs::read_to_string(default_dir.join(PLAYLISTS_DIR).join(format!("{id}.json")))
                    .ok()?;
            let value: serde_json::Value = serde_json::from_str(&text).ok()?;
            value.get("playlist").map(|playlist| playlist.to_string())
        })
        .collect()
}

fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let destination = to.join(entry.file_name());
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            copy_dir(&entry.path(), &destination)?;
        } else if file_type.is_file() {
            fs::copy(entry.path(), destination)?;
        }
    }
    Ok(())
}

pub fn mirror_default_data(default_dir: &Path, profile_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(profile_dir)
        .map_err(|error| format!("Failed to create profile directory: {error}"))?;
    let default_path = default_dir.to_string_lossy().to_string();
    let profile_path = profile_dir.to_string_lossy().to_string();
    for name in MIRRORED_FILES {
        let Ok(text) = fs::read_to_string(default_dir.join(name)) else {
            continue;
        };
        fs::write(
            profile_dir.join(name),
            text.replace(&default_path, &profile_path),
        )
        .map_err(|error| format!("Failed to mirror {name}: {error}"))?;
    }
    for name in MIRRORED_DIRS {
        let source = default_dir.join(name);
        if !source.is_dir() {
            continue;
        }
        let destination = profile_dir.join(name);
        let _ = fs::remove_dir_all(&destination);
        copy_dir(&source, &destination)
            .map_err(|error| format!("Failed to mirror {name}: {error}"))?;
    }
    Ok(())
}

pub fn launcher_path(applications_dir: &Path, name: &str) -> PathBuf {
    applications_dir.join(format!("{LAUNCHER_PREFIX}{name}.desktop"))
}

pub fn launcher_text(executable: &str, name: &str) -> String {
    let quoted = executable.replace('\\', "\\\\").replace('"', "\\\"");
    format!(
        "[Desktop Entry]\nType=Application\nName=Nuclear ({name})\nComment=Nuclear light profile: only its chosen playlists\nExec=\"{quoted}\" --profile {name}\nIcon=nuclear-music-player\nCategories=AudioVideo;Audio;Music;\nTerminal=false\nX-Nuclear-Light-Profile={name}\n"
    )
}

fn is_claritard_launcher(path: &Path) -> bool {
    fs::read_to_string(path).is_ok_and(|text| text.lines().any(|line| line.trim() == CLARITARD_MARKER))
}

pub fn sync_launchers(
    applications_dir: &Path,
    executable: &str,
    profiles: &[LightProfile],
) -> Result<(), String> {
    fs::create_dir_all(applications_dir)
        .map_err(|error| format!("Failed to create applications directory: {error}"))?;
    for profile in profiles {
        let path = launcher_path(applications_dir, &profile.name);
        if is_claritard_launcher(&path) {
            continue;
        }
        fs::write(&path, launcher_text(executable, &profile.name))
            .map_err(|error| format!("Failed to write launcher for {}: {error}", profile.name))?;
    }
    let Ok(entries) = fs::read_dir(applications_dir) else {
        return Ok(());
    };
    for entry in entries.flatten() {
        let file_name = entry.file_name().to_string_lossy().to_string();
        let Some(name) = file_name
            .strip_prefix(LAUNCHER_PREFIX)
            .and_then(|rest| rest.strip_suffix(".desktop"))
        else {
            continue;
        };
        let still_wanted = profiles.iter().any(|profile| profile.name == name);
        if !still_wanted && !is_claritard_launcher(&entry.path()) {
            let _ = fs::remove_file(entry.path());
        }
    }
    Ok(())
}

fn default_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let DefaultIdentifier(identifier) = app.state::<DefaultIdentifier>().inner();
    app.path()
        .data_dir()
        .map(|dir| dir.join(identifier))
        .map_err(|error| format!("Failed to resolve data directory: {error}"))
}

fn applications_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .data_dir()
        .map(|dir| dir.join("applications"))
        .map_err(|error| format!("Failed to resolve data directory: {error}"))
}

fn launcher_executable() -> Result<String, String> {
    if let Ok(appimage) = std::env::var("APPIMAGE") {
        return Ok(appimage);
    }
    #[cfg(target_os = "linux")]
    if crate::chromium_host::enabled() {
        return Ok("/usr/bin/nuclear-music-player".into());
    }
    std::env::current_exe()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|error| format!("Failed to find the Nuclear executable: {error}"))
}

#[tauri::command]
#[specta::specta]
pub fn light_profile_active(
    app: AppHandle,
    current: State<'_, CurrentProfile>,
) -> Result<Option<ActiveLightProfile>, String> {
    let Some(name) = &current.name else {
        return Ok(None);
    };
    let default_dir = default_dir(&app)?;
    let Some(profile) = read_profiles(&default_dir)
        .into_iter()
        .find(|profile| &profile.name == name)
    else {
        return Ok(None);
    };
    let mut mirrored = current.mirrored.lock().map_err(|error| error.to_string())?;
    if !*mirrored {
        let profile_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("Failed to resolve profile directory: {error}"))?;
        mirror_default_data(&default_dir, &profile_dir)?;
        *mirrored = true;
    }
    Ok(Some(ActiveLightProfile {
        name: profile.name,
        playlists_json: read_playlists(&default_dir, &profile.playlist_ids),
    }))
}

#[tauri::command]
#[specta::specta]
pub fn light_profiles_list(app: AppHandle) -> Result<Vec<LightProfile>, String> {
    Ok(read_profiles(&default_dir(&app)?))
}

#[tauri::command]
#[specta::specta]
pub fn light_profiles_save(
    app: AppHandle,
    current: State<'_, CurrentProfile>,
    profiles: Vec<LightProfile>,
) -> Result<(), String> {
    if current.name.is_some() {
        return Err("Light profiles can only be changed from the main Nuclear profile.".into());
    }
    validate_profiles(&profiles)?;
    write_profiles(&default_dir(&app)?, &profiles)?;
    if cfg!(target_os = "linux") {
        sync_launchers(&applications_dir(&app)?, &launcher_executable()?, &profiles)?;
    }
    Ok(())
}

#[cfg(test)]
#[path = "light_profile.test.rs"]
mod tests;
