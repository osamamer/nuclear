use std::sync::Arc;

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{header, HeaderMap, Response, StatusCode};
use axum::routing::get;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use reqwest::Client;
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tokio::io::{AsyncReadExt, AsyncSeekExt, SeekFrom};
use tokio::sync::oneshot;
use tokio_util::io::ReaderStream;
use tokio_util::sync::CancellationToken;

const PORT_START: u16 = 9100;
const PORT_END: u16 = 9109;

const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

const FORWARD_HEADERS: &[header::HeaderName] = &[
    header::CONTENT_TYPE,
    header::CONTENT_LENGTH,
    header::CONTENT_RANGE,
    header::ACCEPT_RANGES,
];

pub struct StreamServerState {
    port: u16,
}

#[derive(Clone)]
struct StreamHttpState {
    client: Arc<Client>,
    downloads_dir: PathBuf,
}

fn decode_stream_url(encoded: &str) -> Result<String, String> {
    let bytes = URL_SAFE_NO_PAD
        .decode(encoded)
        .map_err(|err| format!("Invalid base64 URL: {err}"))?;

    let url = String::from_utf8(bytes).map_err(|err| format!("Invalid UTF-8 in URL: {err}"))?;

    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL scheme. Expected http(s)".to_string());
    }

    Ok(url)
}

fn cors_headers(headers: &mut HeaderMap) {
    headers.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*".parse().unwrap());
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_METHODS,
        "GET, OPTIONS, HEAD".parse().unwrap(),
    );
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_HEADERS,
        "Range".parse().unwrap(),
    );
    headers.insert(
        header::ACCESS_CONTROL_EXPOSE_HEADERS,
        "Content-Range, Content-Length, Accept-Ranges"
            .parse()
            .unwrap(),
    );
}

fn error_response(status: StatusCode, message: String) -> Response<Body> {
    let mut response = Response::builder()
        .status(status)
        .body(Body::from(message))
        .unwrap();
    cors_headers(response.headers_mut());
    response
}

async fn proxy_stream(
    State(state): State<Arc<StreamHttpState>>,
    Path(encoded_url): Path<String>,
    headers: HeaderMap,
) -> Response<Body> {
    let url = match decode_stream_url(&encoded_url) {
        Ok(url) => url,
        Err(message) => {
            log::error!("[StreamServer] {message}");
            return error_response(StatusCode::BAD_REQUEST, message);
        }
    };

    log::debug!(
        "[StreamServer] Proxying request, range: {:?}",
        headers.get(header::RANGE)
    );

    let mut upstream_request = state.client.get(&url);
    if let Some(range_value) = headers.get(header::RANGE) {
        upstream_request = upstream_request.header(header::RANGE, range_value);
    }

    let upstream_response = match upstream_request.send().await {
        Ok(response) => response,
        Err(err) => {
            log::error!("[StreamServer] Request failed: {err:?}");
            return error_response(StatusCode::BAD_GATEWAY, format!("Failed to fetch: {err}"));
        }
    };

    let upstream_status = upstream_response.status();
    if !upstream_status.is_success() && upstream_status != StatusCode::PARTIAL_CONTENT {
        log::error!("[StreamServer] Streaming service returned: {upstream_status}");
        return error_response(
            StatusCode::from_u16(upstream_status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            format!("Streaming service returned error: {upstream_status}"),
        );
    }

    let upstream_headers = upstream_response.headers().clone();
    let body = Body::from_stream(upstream_response.bytes_stream());

    let mut response = Response::builder()
        .status(upstream_status.as_u16())
        .body(body)
        .unwrap();

    for name in FORWARD_HEADERS {
        if let Some(value) = upstream_headers.get(name) {
            response.headers_mut().insert(name, value.clone());
        }
    }

    cors_headers(response.headers_mut());
    response
}

fn parse_range(range: &str, file_size: u64) -> Option<(u64, u64)> {
    let range = range.strip_prefix("bytes=")?;
    if range.contains(',') {
        return None;
    }
    let (start, end) = range.split_once('-')?;
    if start.is_empty() {
        let suffix_length = end.parse::<u64>().ok()?.min(file_size);
        if suffix_length == 0 {
            return None;
        }
        return Some((file_size - suffix_length, file_size - 1));
    }

    let start = start.parse::<u64>().ok()?;
    if start >= file_size {
        return None;
    }
    let end = if end.is_empty() {
        file_size - 1
    } else {
        end.parse::<u64>().ok()?.min(file_size - 1)
    };
    (end >= start).then_some((start, end))
}

async fn proxy_local_file(
    State(state): State<Arc<StreamHttpState>>,
    Path(file_name): Path<String>,
    headers: HeaderMap,
) -> Response<Body> {
    if !crate::downloads::validate_track_filename(&file_name) {
        return error_response(StatusCode::NOT_FOUND, "Track not found".to_string());
    }

    let path = state.downloads_dir.join(&file_name);
    let mut file = match tokio::fs::File::open(&path).await {
        Ok(file) => file,
        Err(error) => {
            log::error!("[StreamServer] Failed to open local track: {error}");
            return error_response(StatusCode::NOT_FOUND, "Track not found".to_string());
        }
    };
    let file_size = match file.metadata().await {
        Ok(metadata) => metadata.len(),
        Err(error) => {
            log::error!("[StreamServer] Failed to read local track metadata: {error}");
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to read track".to_string(),
            );
        }
    };

    let requested_range = headers
        .get(header::RANGE)
        .and_then(|value| value.to_str().ok());
    let (status, start, end) = match requested_range {
        Some(range) => match parse_range(range, file_size) {
            Some((start, end)) => (StatusCode::PARTIAL_CONTENT, start, end),
            None => {
                let mut response = Response::builder()
                    .status(StatusCode::RANGE_NOT_SATISFIABLE)
                    .header(header::CONTENT_RANGE, format!("bytes */{file_size}"))
                    .body(Body::empty())
                    .unwrap();
                cors_headers(response.headers_mut());
                return response;
            }
        },
        None if file_size > 0 => (StatusCode::OK, 0, file_size - 1),
        None => (StatusCode::OK, 0, 0),
    };
    let content_length = if file_size == 0 { 0 } else { end - start + 1 };
    if file.seek(SeekFrom::Start(start)).await.is_err() {
        return error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to seek track".to_string(),
        );
    }

    let body = if content_length == 0 {
        Body::empty()
    } else {
        Body::from_stream(ReaderStream::new(file.take(content_length)))
    };
    let content_type = match path.extension().and_then(|extension| extension.to_str()) {
        Some("aac") => "audio/aac",
        Some("flac") => "audio/flac",
        Some("m4a") => "audio/mp4",
        Some("mp3") => "audio/mpeg",
        Some("ogg" | "opus") => "audio/ogg",
        Some("wav") => "audio/wav",
        Some("webm") => "audio/webm",
        _ => "application/octet-stream",
    };
    let mut response = Response::builder()
        .status(status)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_LENGTH, content_length.to_string())
        .header(header::CONTENT_TYPE, content_type)
        .body(body)
        .unwrap();
    if status == StatusCode::PARTIAL_CONTENT {
        response.headers_mut().insert(
            header::CONTENT_RANGE,
            format!("bytes {start}-{end}/{file_size}").parse().unwrap(),
        );
    }
    cors_headers(response.headers_mut());
    response
}

async fn options_handler() -> Response<Body> {
    let mut response = Response::builder()
        .status(StatusCode::NO_CONTENT)
        .body(Body::empty())
        .unwrap();
    cors_headers(response.headers_mut());
    response
}

async fn start_server(state: Arc<StreamHttpState>, ready: oneshot::Sender<Result<u16, String>>) {
    let cancellation_token = CancellationToken::new();

    let router = axum::Router::new()
        .route(
            "/stream/{encoded_url}",
            get(proxy_stream).options(options_handler),
        )
        .route("/local/{file_name}", get(proxy_local_file))
        .with_state(state);

    let tcp_listener =
        match crate::net::bind_first_available_port("127.0.0.1", PORT_START, PORT_END).await {
            Ok(listener) => listener,
            Err(message) => {
                log::error!("Failed to bind stream server: {message}");
                let _ = ready.send(Err(message));
                return;
            }
        };

    let bound_port = tcp_listener.local_addr().unwrap().port();
    log::info!("Stream proxy listening on http://127.0.0.1:{bound_port}");
    let _ = ready.send(Ok(bound_port));

    let _ = axum::serve(tcp_listener, router)
        .with_graceful_shutdown(async move {
            cancellation_token.cancelled().await;
        })
        .await;

    log::info!("Stream server stopped");
}

pub fn init_stream_server(app_handle: AppHandle) {
    let client = Arc::new(
        Client::builder()
            .user_agent(USER_AGENT)
            .read_timeout(Duration::from_secs(300))
            .connect_timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client for stream server"),
    );

    let downloads_dir = match app_handle.path().app_data_dir() {
        Ok(path) => path.join("downloads"),
        Err(error) => {
            log::error!("Failed to find downloads directory: {error}");
            return;
        }
    };
    let state = Arc::new(StreamHttpState {
        client,
        downloads_dir,
    });

    let (ready_tx, ready_rx) = oneshot::channel();
    tauri::async_runtime::spawn(start_server(state, ready_tx));

    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        match ready_rx.await {
            Ok(Ok(port)) => {
                log::info!("Stream server ready on port {port}");
                handle.manage(StreamServerState { port });
            }
            Ok(Err(message)) => {
                log::error!("Stream server failed to start: {message}");
            }
            Err(_) => {
                log::error!("Stream server task exited before reporting ready");
            }
        }
    });
}

#[tauri::command]
#[specta::specta]
pub fn stream_server_port(state: tauri::State<'_, StreamServerState>) -> u16 {
    state.port
}
