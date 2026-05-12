use crate::config::Config;
use clap::Subcommand;

#[derive(Subcommand)]
pub enum AppCommands {
    /// List all applications
    List,
    /// Deploy a new version
    Deploy {
        #[arg(short, long)]
        app: String,
        #[arg(short, long)]
        strategy: Option<String>,
    },
    /// Stream runtime logs
    Logs {
        #[arg(long, default_value = "false")]
        follow: bool,
    },
}

pub async fn handle(cmd: AppCommands) -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::load()?;
    let client = reqwest::Client::new();

    let auth_header = format!("Bearer {}", config.token.unwrap_or_default());

    match cmd {
        AppCommands::List => {
            println!("Fetching apps from {}/apps...", config.endpoint);
            let resp = client
                .get(format!("{}/apps", config.endpoint))
                .header("Authorization", &auth_header)
                .send()
                .await?;
            let status = resp.status();
            if status.is_success() {
                println!("OK! Apps fetched.");
                let _body = resp.text().await?;
            } else {
                println!("Error fetching apps: {}", status);
            }
        }
        AppCommands::Deploy { app, strategy } => {
            let s = strategy.unwrap_or_else(|| "rolling".to_string());
            println!("Deploying application '{}' using {} strategy...", app, s);

            // Phase 1 Mock Deployment Request
            let deploy_payload = serde_json::json!({
                "strategy": s,
                "commit": "HEAD", // would pull from git locally
            });

            let resp = client
                .post(format!("{}/apps/{}/deployments", config.endpoint, app))
                .header("Authorization", &auth_header)
                .json(&deploy_payload)
                .send()
                .await?;

            if resp.status().is_success() {
                println!("Deployment triggered successfully!");
            } else {
                println!("Failed to trigger deployment: {}", resp.status());
            }
        }
        AppCommands::Logs { follow } => {
            println!("Fetching logs (follow={})...", follow);
            // Stream logs from WebSocket endpoint
        }
    }
    Ok(())
}
