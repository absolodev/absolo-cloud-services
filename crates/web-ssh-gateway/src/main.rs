use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use k8s_openapi::api::core::v1::Pod;
use kube::{
    api::{Api, AttachParams},
    Client,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tracing::{error, info, warn};

#[derive(Deserialize)]
struct ShellParams {
    token: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    pod_name: String,
    namespace: String,
    exp: usize,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    // Verify K8s client init before starting server
    let _client = Client::try_default().await?;

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

    Ok(())
}

async fn ws_handler(ws: WebSocketUpgrade, Query(params): Query<ShellParams>) -> impl IntoResponse {
    let secret = std::env::var("SHELL_TOKEN_SECRET").unwrap_or_else(|_| "dev-secret".to_string());

    // Validate JWT
    let token_data = match decode::<Claims>(
        &params.token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    ) {
        Ok(c) => c,
        Err(e) => {
            warn!("Invalid token: {}", e);
            return ws.on_upgrade(|mut socket| async move {
                let _ = socket
                    .send(Message::Text("Unauthorized: Invalid token\r\n".into()))
                    .await;
                let _ = socket.close().await;
            });
        }
    };

    info!(
        "New websocket connection for pod: {} in ns: {}",
        token_data.claims.pod_name, token_data.claims.namespace
    );

    ws.on_upgrade(move |socket| {
        handle_socket(
            socket,
            token_data.claims.pod_name,
            token_data.claims.namespace,
        )
    })
}

async fn handle_socket(mut socket: WebSocket, pod_name: String, namespace: String) {
    if socket
        .send(Message::Text(
            "Welcome to Absolo Web SSH Shell!\r\nConnecting to container...\r\n".into(),
        ))
        .await
        .is_err()
    {
        return;
    }

    let client = match Client::try_default().await {
        Ok(c) => c,
        Err(e) => {
            let _ = socket
                .send(Message::Text(format!("Platform error: {}\r\n", e).into()))
                .await;
            return;
        }
    };

    let pods: Api<Pod> = Api::namespaced(client, &namespace);

    let ap = AttachParams::default()
        .container("app")
        .stdin(true)
        .stdout(true)
        .stderr(true)
        .tty(true);

    let exec_cmd = vec!["/bin/sh", "-c", "bash || sh"];

    info!("Exec into {} / {}", namespace, pod_name);
    let mut attached = match pods.exec(&pod_name, exec_cmd, &ap).await {
        Ok(a) => a,
        Err(e) => {
            let _ = socket
                .send(Message::Text(
                    format!("Pod connection error: {:?}\r\n", e).into(),
                ))
                .await;
            return;
        }
    };

    info!("Attached to pod {}", pod_name);

    let (mut ws_sender, mut ws_receiver) = socket.split();

    let mut std_out = attached.stdout().unwrap();
    let mut std_in = attached.stdin().unwrap();

    let pod_to_ws = async move {
        let mut buf = [0u8; 1024];
        loop {
            match std_out.read(&mut buf).await {
                Ok(0) => break,
                Ok(n) => {
                    if ws_sender
                        .send(Message::Binary(buf[..n].to_vec().into()))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Err(e) => {
                    error!("Error reading from pod: {:?}", e);
                    break;
                }
            }
        }
        let _ = ws_sender.close().await;
    };

    let ws_to_pod = async move {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Binary(b)) => {
                    if std_in.write_all(&b).await.is_err() {
                        break;
                    }
                }
                Ok(Message::Text(t)) => {
                    if std_in.write_all(t.as_bytes()).await.is_err() {
                        break;
                    }
                }
                Ok(Message::Close(_)) | Err(_) => break,
                _ => {}
            }
        }
    };

    tokio::select! {
        _ = pod_to_ws => info!("Pod to WS bridge closed"),
        _ = ws_to_pod => info!("WS to Pod bridge closed"),
    }
}
