use tokio;

#[tokio::main]
async fn main() {
    println!("Starting Absolo Host Agent v{}", absolo_shared::VERSION);
    println!("Waiting for control plane connection...");

    // TODO: implement grpc reverse tunnel
    let _ = tokio::signal::ctrl_c().await;
    println!("Shutting down");
}
