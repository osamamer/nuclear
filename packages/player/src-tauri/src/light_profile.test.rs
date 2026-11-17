use std::fs;

use super::{
    launcher_path, mirror_default_data, read_playlists, read_profiles, sync_launchers,
    validate_profiles, write_profiles, LightProfile,
};

fn calm(playlist_ids: &[&str]) -> LightProfile {
    LightProfile {
        name: "calm".into(),
        playlist_ids: playlist_ids.iter().map(|id| id.to_string()).collect(),
    }
}

#[test]
fn saved_profiles_are_read_back() {
    let dir = tempfile::tempdir().unwrap();
    write_profiles(dir.path(), &[calm(&["one"])]).unwrap();
    assert_eq!(read_profiles(dir.path()), vec![calm(&["one"])]);
}

#[test]
fn no_profiles_file_means_no_profiles() {
    let dir = tempfile::tempdir().unwrap();
    assert!(read_profiles(dir.path()).is_empty());
}

#[test]
fn duplicate_or_unsafe_names_are_refused() {
    assert!(validate_profiles(&[calm(&[]), calm(&[])]).is_err());
    let unsafe_name = LightProfile {
        name: "../calm".into(),
        playlist_ids: vec![],
    };
    assert!(validate_profiles(&[unsafe_name]).is_err());
    assert!(validate_profiles(&[calm(&[])]).is_ok());
}

#[test]
fn only_the_chosen_playlists_are_read_and_missing_ones_are_skipped() {
    let dir = tempfile::tempdir().unwrap();
    let playlists = dir.path().join("playlists");
    fs::create_dir_all(&playlists).unwrap();
    fs::write(playlists.join("one.json"), r#"{"playlist":{"id":"one"}}"#).unwrap();
    fs::write(playlists.join("two.json"), r#"{"playlist":{"id":"two"}}"#).unwrap();

    let found = read_playlists(dir.path(), &["one".into(), "gone".into(), "../two".into()]);

    assert_eq!(found, vec![r#"{"id":"one"}"#.to_string()]);
}

#[test]
fn mirroring_copies_settings_and_plugins_with_paths_pointing_at_the_profile() {
    let root = tempfile::tempdir().unwrap();
    let default_dir = root.path().join("com.nuclearplayer");
    let profile_dir = root.path().join("com.nuclearplayer.profile.calm");
    fs::create_dir_all(default_dir.join("plugins/youtube")).unwrap();
    fs::write(default_dir.join("plugins/youtube/index.js"), "plugin").unwrap();
    let plugin_path = default_dir.join("plugins/youtube");
    fs::write(
        default_dir.join("plugins.json"),
        format!(r#"{{"path":"{}"}}"#, plugin_path.display()),
    )
    .unwrap();
    fs::create_dir_all(profile_dir.join("plugins/removed")).unwrap();

    mirror_default_data(&default_dir, &profile_dir).unwrap();

    assert_eq!(
        fs::read_to_string(profile_dir.join("plugins.json")).unwrap(),
        format!(r#"{{"path":"{}"}}"#, profile_dir.join("plugins/youtube").display())
    );
    assert!(profile_dir.join("plugins/youtube/index.js").is_file());
    assert!(!profile_dir.join("plugins/removed").exists());
}

#[test]
fn launchers_follow_the_profiles_but_claritard_wrapped_ones_are_left_alone() {
    let dir = tempfile::tempdir().unwrap();
    let applications = dir.path();
    let focus = LightProfile {
        name: "focus".into(),
        playlist_ids: vec![],
    };
    sync_launchers(applications, "/usr/bin/nuclear-music-player", &[calm(&[]), focus.clone()])
        .unwrap();
    let calm_launcher = fs::read_to_string(launcher_path(applications, "calm")).unwrap();
    assert!(calm_launcher.contains("Exec=\"/usr/bin/nuclear-music-player\" --profile calm"));

    let wrapped = "[Desktop Entry]\nExec=claritard\nX-Claritard-Timeout=true\n";
    fs::write(launcher_path(applications, "calm"), wrapped).unwrap();
    sync_launchers(applications, "/usr/bin/nuclear-music-player", &[calm(&[])]).unwrap();

    assert_eq!(
        fs::read_to_string(launcher_path(applications, "calm")).unwrap(),
        wrapped
    );
    assert!(!launcher_path(applications, "focus").exists());
}
