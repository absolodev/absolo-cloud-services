use axum::{
    body::Body,
    extract::{Request, State},
    http::{Response, StatusCode, Uri},
    routing::any,
    Router,
};
use hyper_util::client::legacy::{connect::HttpConnector, Client};
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing::{info, warn};

#[derive(Clone)]
struct AppState {
    client: Client<HttpConnector, Body>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let client = Client::builder(hyper_util::rt::TokioExecutor::new()).build_http();
    let state = AppState { client };

    let app = Router::new()
        .route("/*path", any(handler))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = "0.0.0.0:8080";
    let listener = TcpListener::bind(addr).await?;
    info!("Edge Proxy listening on {}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

use hyper::body::Incoming;

async fn handler(
    State(state): State<AppState>,
    mut req: Request,
) -> Result<Response<Incoming>, StatusCode> {
    let path = req.uri().path();
    let path_query = req
        .uri()
        .path_and_query()
        .map(|v| v.as_str())
        .unwrap_or(path);

    let host = req
        .headers()
        .get("host")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown");

    // TODO: Dynamic resolution via control plane (Redis/NATS)
    // Hardcoded for Phase 1 skeleton
    let target_base = match host {
        "admin.localhost" | "admin.absolo.dev" => "http://localhost:5174",
        "dashboard.localhost" | "dashboard.absolo.dev" => "http://localhost:5173",
        "localhost" | "www.absolo.dev" => "http://localhost:3000",
        _ => "http://localhost:3000",
    };

    let uri = format!("{}{}", target_base, path_query);

    *req.uri_mut() = Uri::try_from(uri).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    state.client.request(req).await.map_err(|e| {
        warn!("Proxy error: {}", e);
        StatusCode::BAD_GATEWAY
    })
}
