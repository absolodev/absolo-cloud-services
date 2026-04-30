use async_nats::Client;
use core::time::Duration;
use std::env;
use tokio::time::sleep;
use tracing::{info, warn};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let nats_url = env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string());
    info!("Log Shipper starting, will connect to NATS at {}", nats_url);

    let client: Client = async_nats::connect(&nats_url).await?;

    info!("Successfully connected to NATS JetStream.");

    // Log Shipper typically reads from local UNIX sockets (Vector) and pushes to NATS upstream
    // or directly forwards Docker/containerd logs.
    // For Phase 1 mockup: read mock logs and publish to NATS

    let subject = "logs.apps.sample";

    loop {
        sleep(Duration::from_secs(10)).await;

        let payload = r#"{"level":"info","msg":"ping from container"}"#;
        match client.publish(subject, payload.into()).await {
            Ok(_) => info!("Shipped mock log to {}", subject),
            Err(e) => warn!("Failed to ship log: {}", e),
        }
    }
}
