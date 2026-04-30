use async_nats::jetstream;
use futures_util::StreamExt;
use std::env;
use tracing::{info, warn};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let nats_url = env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string());
    info!("Metering Aggregator connecting to NATS at {}", nats_url);

    let client = async_nats::connect(&nats_url).await?;
    let js = jetstream::new(client.clone());

    // Ensure the stream exists
    // In production, OpenTofu / JetStream admin creates it, but we can attempt to bind.
    let stream_name = "USAGE_EVENTS";
    info!("Binding to JetStream stream '{}'", stream_name);

    match js.get_stream(stream_name).await {
        Ok(_) => {
            info!("Stream {} found.", stream_name);
        }
        Err(e) => {
            warn!(
                "Stream {} not found or could not verify: {}. Skipping raw tail for now.",
                stream_name, e
            );
            // Fallback: Just subscribe to raw NATS subject if JS stream isn't there
        }
    }

    let subject = "usage.compute.tick";
    let mut subscriber = client.subscribe(subject).await?;
    info!("Listening for {} events...", subject);

    while let Some(msg) = subscriber.next().await {
        let payload = String::from_utf8_lossy(&msg.payload);
        info!("Received tick event: {}", payload);
        // TODO: Accumulate ticks into fractional hours in memory/Redis
        // TODO: Store hourly summaries in Postgres (usage_hourly)
    }

    Ok(())
}
