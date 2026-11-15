use std::ffi::{c_char, c_int, c_void, CStr};

use tauri::{App, Manager};
use webkit2gtk::glib::translate::ToGlibPtr;
use webkit2gtk::{HardwareAccelerationPolicy, SettingsExt, WebViewExt};

extern "C" {
    fn webkit_settings_get_all_features() -> *mut c_void;
    fn webkit_feature_list_get_length(list: *mut c_void) -> usize;
    fn webkit_feature_list_get(list: *mut c_void, index: usize) -> *mut c_void;
    fn webkit_feature_list_unref(list: *mut c_void);
    fn webkit_feature_get_identifier(feature: *mut c_void) -> *const c_char;
    fn webkit_settings_get_feature_enabled(settings: *mut c_void, feature: *mut c_void) -> c_int;
}

const REPORTED_FEATURES: [&str; 4] = [
    "AcceleratedCompositing",
    "ForceCompositingMode",
    "ThreadedScrolling",
    "AsyncOverflowScrolling",
];

fn feature_states(settings: *mut c_void) -> Vec<String> {
    unsafe {
        let list = webkit_settings_get_all_features();
        if list.is_null() {
            return Vec::new();
        }
        let states = (0..webkit_feature_list_get_length(list))
            .map(|index| webkit_feature_list_get(list, index))
            .filter_map(|feature| {
                let identifier = CStr::from_ptr(webkit_feature_get_identifier(feature))
                    .to_string_lossy()
                    .into_owned();
                REPORTED_FEATURES.contains(&identifier.as_str()).then(|| {
                    let enabled = webkit_settings_get_feature_enabled(settings, feature) != 0;
                    format!("{identifier}={enabled}")
                })
            })
            .collect();
        webkit_feature_list_unref(list);
        states
    }
}

pub fn tune_main_webview(app: &App) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let _ = window.with_webview(|platform| {
        let Some(settings) = platform.inner().settings() else {
            return;
        };
        let settings_pointer: *mut webkit2gtk::ffi::WebKitSettings = settings.to_glib_none().0;
        let before = settings.hardware_acceleration_policy();
        settings.set_hardware_acceleration_policy(HardwareAccelerationPolicy::Always);
        settings.set_enable_smooth_scrolling(true);
        log::info!(
            "WebKit rendering: policy {:?} -> {:?}, {}",
            before,
            settings.hardware_acceleration_policy(),
            feature_states(settings_pointer.cast()).join(" ")
        );
    });
}
