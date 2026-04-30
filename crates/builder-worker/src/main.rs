use async_nats::jetstream;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{error, info, warn};

#[derive(Debug, Deserialize, Serialize)]
struct BuildRequestedEvent {
    saga_id: String,
    deployment_id: String,
    app_id: String,
    environment_id: String,
    source_kind: String,
    source_ref: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    info!("Starting Absolo Builder Worker v{}", absolo_shared::VERSION);

    let nats_url = std::env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".into());
    info!("Connecting to NATS at {}...", nats_url);

    let client = match async_nats::connect(&nats_url).await {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to connect to NATS: {}", e);
            sleep(Duration::from_secs(5)).await;
            return Err(e.into());
        }
    };

    let js = jetstream::new(client.clone());

    let stream_name = "OUTBOX";
    let _ = js
        .create_stream(jetstream::stream::Config {
            name: stream_name.to_string(),
            subjects: vec!["outbox.>".into()],
            ..Default::default()
        })
        .await;

    let stream = match js.get_stream(stream_name).await {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to get stream OUTBOX: {}", e);
            return Err(e.into());
        }
    };

    let consumer_name = "builder_worker_pull";
    let consumer = stream
        .create_consumer(jetstream::consumer::pull::Config {
            durable_name: Some(consumer_name.to_string()),
            filter_subject: "outbox.build.requested".into(),
            ack_policy: jetstream::consumer::AckPolicy::Explicit,
            ..Default::default()
        })
        .await?;

    info!("Listening for build.requested events...");

    let mut messages = consumer.messages().await?;

    while let Some(msg_result) = messages.next().await {
        match msg_result {
            Ok(msg) => {
                info!("Received message on subject: {}", msg.subject);

                match serde_json::from_slice::<BuildRequestedEvent>(&msg.payload) {
                    Ok(event) => {
                        info!(
                            "Starting build for app {} (deployment {})",
                            event.app_id, event.deployment_id
                        );

                        sleep(Duration::from_secs(3)).await;
                        info!(
                            "Build mock completed for deployment {}",
                            event.deployment_id
                        );

                        let _ = client
                            .publish(
                                "orchestrator.deployment.live",
                                serde_json::to_vec(&event).unwrap().into(),
                            )
                            .await;

                        if let Err(e) = msg.ack().await {
                            warn!("Failed to ack message: {}", e);
                        } else {
                            info!("Message acked successfully");
                        }
                    }
                    Err(e) => {
                        error!("Failed to deserialize build event: {}", e);
                        let _ = msg.ack().await; // Ack poison pills to move on
                    }
                }
            }
            Err(e) => {
                error!("Error pulling message: {}", e);
            }
        }
    }

    Ok(())
}
