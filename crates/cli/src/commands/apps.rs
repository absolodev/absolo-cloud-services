use clap::Subcommand;

#[derive(Subcommand)]
pub enum AppCommands {
    /// List all applications
    List,
    /// Deploy a new version
    Deploy {
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
    match cmd {
        AppCommands::List => {
            println!("No applications found in current project.");
            // TODO: call control-plane REST API
        }
        AppCommands::Deploy { strategy } => {
            let s = strategy.unwrap_or_else(|| "rolling".to_string());
            println!("Deploying application using {} strategy...", s);
            // TODO: dispatch zip/image to builder-worker / control-plane
        }
        AppCommands::Logs { follow } => {
            println!("Fetching logs (follow={})...", follow);
            // TODO: stream from Log Shipper/Loki
        }
    }
    Ok(())
}
