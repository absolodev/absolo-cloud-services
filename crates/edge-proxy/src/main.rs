use async_nats::jetstream::{self, kv::Config};
use axum::{
    body::Body,
    extract::{Request, State},
    http::{Response, StatusCode, Uri},
    routing::any,
    Router,
};
use dashmap::DashMap;
use hyper::body::Incoming;
use hyper_util::client::legacy::{connect::HttpConnector, Client};
use std::{
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tokio_stream::StreamExt;
use tower_http::trace::TraceLayer;
use tracing::{error, info, warn};

// IP -> (tokens, last_refill)
#[derive(Clone)]
struct RateLimiter {
    buckets: Arc<DashMap<String, (u32, Instant)>>,
    capacity: u32,
    refill_rate: f32, // tokens per second
}

impl RateLimiter {
    fn new(capacity: u32, refill_rate: f32) -> Self {
        Self {
            buckets: Arc::new(DashMap::new()),
            capacity,
            refill_rate,
        }
    }

    fn check(&self, ip: &str) -> bool {
        let now = Instant::now();
        let mut entry = self
            .buckets
            .entry(ip.to_string())
            .or_insert((self.capacity, now));

        let (mut tokens, last_refill) = *entry;
        let elapsed = now.duration_since(last_refill).as_secs_f32();

        if elapsed > 0.0 {
            let refilled = (elapsed * self.refill_rate) as u32;
            if refilled > 0 {
                tokens = std::cmp::min(self.capacity, tokens + refilled);
                *entry = (tokens, now);
            }
        }

        if tokens > 0 {
            entry.0 -= 1;
            true
        } else {
            false
        }
    }
}

#[derive(Clone)]
struct AppState {
    client: Client<HttpConnector, Body>,
    routing_table: Arc<RwLock<std::collections::HashMap<String, String>>>,
    rate_limiter: RateLimiter,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    info!("Starting Edge Proxy v{}", absolo_shared::VERSION);

    let client = Client::builder(hyper_util::rt::TokioExecutor::new()).build_http();
    let routing_table = Arc::new(RwLock::new(std::collections::HashMap::new()));

    // 50 tokens max, refill 10 per sec
    let rate_limiter = RateLimiter::new(50, 10.0);

    // Seed defaults
    {
        let mut rt = routing_table.write().await;
        rt.insert("admin.localhost".into(), "http://localhost:5174".into());
        rt.insert("admin.absolo.dev".into(), "http://localhost:5174".into());
        rt.insert("dashboard.localhost".into(), "http://localhost:5173".into());
        rt.insert(
            "dashboard.absolo.dev".into(),
            "http://localhost:5173".into(),
        );
        rt.insert("www.absolo.dev".into(), "http://localhost:3000".into());
        rt.insert("localhost".into(), "http://localhost:3000".into());
    }

    let state = AppState {
        client,
        routing_table: routing_table.clone(),
        rate_limiter,
    };

    // Spin up NATS watcher in background
    let nats_url = std::env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".into());
    let rt_clone = routing_table.clone();

    tokio::spawn(async move {
        match async_nats::connect(&nats_url).await {
            Ok(nc) => {
                info!("Connected to NATS at {}", nats_url);
                let js = jetstream::new(nc);

                // Ensure KV exists
                match js
                    .create_key_value(Config {
                        bucket: "ROUTES".to_string(),
                        ..Default::default()
                    })
                    .await
                {
                    Ok(kv) => {
                        info!("Attached to ROUTES KV bucket");

                        // Watch for any changes
                        match kv.watch_all().await {
                            Ok(mut watcher) => {
                                while let Some(result) = watcher.next().await {
                                    if let Ok(entry) = result {
                                        let key = entry.key;
                                        if let Ok(val) = std::str::from_utf8(&entry.value) {
                                            info!("Route updated: {} -> {}", key, val);
                                            let mut rtable = rt_clone.write().await;
                                            if val.is_empty() {
                                                rtable.remove(&key);
                                            } else {
                                                rtable.insert(key, val.to_string());
                                            }
                                        }
                                    }
                                }
                            }
                            Err(e) => error!("Failed to watch ROUTES bucket: {}", e),
                        }
                    }
                    Err(e) => error!("Failed to bind KV store: {}", e),
                }
            }
            Err(e) => warn!("Could not connect to NATS for dynamic routing: {}", e),
        }
    });

    let app = Router::new()
        .route("/{*path}", any(handler))
        .route("/", any(handler)) // Root needs its own route in axum 0.7+
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = "0.0.0.0:8080";
    let listener = TcpListener::bind(addr).await?;
    info!("Edge Proxy listening on {}", addr);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await?;

    Ok(())
}

async fn handler(
    State(state): State<AppState>,
    axum::extract::ConnectInfo(peer_addr): axum::extract::ConnectInfo<std::net::SocketAddr>,
    mut req: Request,
) -> Result<Response<Incoming>, StatusCode> {
    let path = req.uri().path();

    // 1. Basic WAF blocklist
    let blocked_paths = [".env", "wp-login.php", "phpmyadmin", ".git"];
    if blocked_paths.iter().any(|b| path.contains(b)) {
        warn!("WAF blocked request to {} from {}", path, peer_addr.ip());
        return Err(StatusCode::FORBIDDEN);
    }

    // 2. Client IP extraction (respect X-Forwarded-For if behind LB)
    let peer_ip_str = peer_addr.ip().to_string();
    let client_ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or(&peer_ip_str)
        .split(',')
        .next()
        .unwrap_or("")
        .trim()
        .to_string();

    // 3. Rate limiting
    if !state.rate_limiter.check(&client_ip) {
        warn!("Rate limited IP: {}", client_ip);
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

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

    let target_base = {
        let rt = state.routing_table.read().await;
        // Exact match first, or wildcard fallback, or default
        rt.get(host)
            .map(|s| s.clone())
            .unwrap_or_else(|| "http://localhost:3000".to_string())
    };

    let uri = format!("{}{}", target_base, path_query);

    *req.uri_mut() = Uri::try_from(&uri).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    state.client.request(req).await.map_err(|e| {
        warn!("Proxy error proxying to {}: {}", uri, e);
        StatusCode::BAD_GATEWAY
    })
}
