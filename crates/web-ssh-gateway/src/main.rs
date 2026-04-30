use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::Deserialize;
use std::net::SocketAddr;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

#[derive(Deserialize)]
struct ShellParams {
    token: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new()
        .route("/v1/shell", get(ws_handler))
        .route("/healthz", get(|| async { "OK" }));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8083));
    info!(
        "Starting Absolo Web SSH Gateway v{}",
        absolo_shared::VERSION
    );
    info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn ws_handler(ws: WebSocketUpgrade, Query(params): Query<ShellParams>) -> impl IntoResponse {
    info!("New websocket connection with token: {}", params.token);

    // In Phase 2: Validate token via Control Plane gRPC or DB/Redis,
    // lookup host-agent router, and forward PTY frames.

    ws.on_upgrade(|socket| handle_socket(socket))
}

async fn handle_socket(mut socket: WebSocket) {
    info!("WebSocket upgraded, sending welcome message...");

    if socket
        .send(Message::Text("Welcome to Absolo Web SSH Shell!\r\n".into()))
        .await
        .is_err()
    {
        warn!("Client disconnected before welcome.");
        return;
    }

    if socket
        .send(Message::Text("Waiting for pod allocation...\r\n".into()))
        .await
        .is_err()
    {
        return;
    }

    // Simulate delay
    sleep(Duration::from_secs(1)).await;

    if socket
        .send(Message::Text("Connected. \r\n$ ".into()))
        .await
        .is_err()
    {
        return;
    }

    loop {
        if let Some(msg) = socket.recv().await {
            if let Ok(msg) = msg {
                match msg {
                    Message::Text(t) => {
                        info!("Received text: {}", t);
                        // Echo it back simply for now
                        if socket
                            .send(Message::Text(format!("You typed: {}\r\n$ ", t).into()))
                            .await
                            .is_err()
                        {
                            break;
                        }
                    }
                    Message::Binary(_) => {
                        error!("Binary streams not yet implemented");
                    }
                    Message::Close(_) => {
                        info!("Client closed connection");
                        break;
                    }
                    _ => {}
                }
            } else {
                warn!("Client disconnected.");
                break;
            }
        } else {
            break;
        }
    }
}
