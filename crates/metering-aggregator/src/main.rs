use core::time::Duration;
use futures_util::StreamExt;
use std::{collections::HashMap, env, sync::Arc};
use tokio::sync::Mutex;
use tracing::{info, warn};

#[derive(Debug, Clone, Default)]
struct HourlyBucket {
    cpu_millis: u64,
    ram_mb_seconds: u64,
    bandwidth_bytes: u64,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let nats_url = env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string());
    info!("Metering Aggregator connecting to NATS at {}", nats_url);

    let client = async_nats::connect(&nats_url).await?;

    // In-memory bucket for Phase 1: TenantID -> Metric Bucket
    let buckets: Arc<Mutex<HashMap<String, HourlyBucket>>> = Arc::new(Mutex::new(HashMap::new()));
    let buckets_clone = buckets.clone();

    // Spawn a background task to flush hourly (mocked to 10 seconds for dev)
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(10));
        loop {
            interval.tick().await;
            let mut b = buckets_clone.lock().await;

            if b.is_empty() {
                continue;
            }

            info!("Flushing {} usage buckets to Postgres (mock)...", b.len());
            for (tenant_id, bucket) in b.iter() {
                info!(
                    "Flushing tenant {}: CPU {}ms, RAM {}MBs, IN/OUT {}B",
                    tenant_id, bucket.cpu_millis, bucket.ram_mb_seconds, bucket.bandwidth_bytes
                );
            }

            // Clear buckets after successful DB insert
            b.clear();
        }
    });

    // Listen for usage.compute.tick
    let subject = "usage.compute.tick";
    let mut compute_sub = client.subscribe(subject).await?;
    info!("Listening for {} events...", subject);

    let b_compute = buckets.clone();
    tokio::spawn(async move {
        while let Some(msg) = compute_sub.next().await {
            let payload = String::from_utf8_lossy(&msg.payload);
            // Payload mock format: "tenant_id:cpu_millis:ram_mb_seconds"
            let parts: Vec<&str> = payload.split(':').collect();
            if parts.len() == 3 {
                let tenant = parts[0].to_string();
                let cpu: u64 = parts[1].parse().unwrap_or(0);
                let ram: u64 = parts[2].parse().unwrap_or(0);

                let mut b = b_compute.lock().await;
                let entry = b.entry(tenant).or_default();
                entry.cpu_millis += cpu;
                entry.ram_mb_seconds += ram;
            }
        }
    });

    // Listen for bandwidth ticks
    let subject = "usage.bandwidth.tick";
    let mut bw_sub = client.subscribe(subject).await?;
    info!("Listening for {} events...", subject);

    while let Some(msg) = bw_sub.next().await {
        let payload = String::from_utf8_lossy(&msg.payload);
        // Payload mock format: "tenant_id:bytes"
        let parts: Vec<&str> = payload.split(':').collect();
        if parts.len() == 2 {
            let tenant = parts[0].to_string();
            let bytes: u64 = parts[1].parse().unwrap_or(0);

            let mut b = buckets.lock().await;
            let entry = b.entry(tenant).or_default();
            entry.bandwidth_bytes += bytes;
        }
    }

    Ok(())
}
