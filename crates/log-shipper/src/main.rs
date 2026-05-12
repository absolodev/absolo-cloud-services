use async_nats::jetstream;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing::{error, info, warn};

#[derive(Clone)]
struct AppState {
    nats_client: async_nats::Client,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    info!("Starting Absolo Log Shipper v{}", absolo_shared::VERSION);

    let nats_url = std::env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".into());
    let nats_client = async_nats::connect(&nats_url).await?;
    info!("Connected to NATS at {}", nats_url);

    let state = AppState { nats_client };

    let app = Router::new()
        .route("/v1/apps/{app_id}/logs/stream", get(ws_handler))
        .with_state(state);

    let addr = "0.0.0.0:8081";
    let listener = TcpListener::bind(addr).await?;
    info!("Log Shipper listening on {}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(app_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, app_id, state))
}

async fn handle_socket(mut socket: WebSocket, app_id: String, state: AppState) {
    // Subject pattern: logs.org.*.app.{app_id}.>
    let subject = format!("logs.org.*.app.{}.>", app_id);

    // Subscribe to NATS core for live tail
    let mut sub = match state.nats_client.subscribe(subject.clone()).await {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to subscribe to NATS subject {}: {}", subject, e);
            let _ = socket
                .send(Message::Text(format!("Error: {}", e).into()))
                .await;
            return;
        }
    };

    info!("Client connected, tailing logs for app {}", app_id);

    // Stream logs to client
    while let Some(msg) = sub.next().await {
        let payload = String::from_utf8_lossy(&msg.payload);
        if socket
            .send(Message::Text(payload.to_string().into()))
            .await
            .is_err()
        {
            info!("Client disconnected from app {}", app_id);
            break; // Client disconnected
        }
    }
}
