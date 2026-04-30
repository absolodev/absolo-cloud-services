use clap::{Parser, Subcommand};

mod commands;

#[derive(Parser)]
#[command(
    name = "absolo",
    version = "1.0",
    author = "Absolo Cloud <hello@absolo.dev>",
    about = "The Absolo Cloud Developer CLI"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Authenticate with Absolo Cloud
    Login,
    /// View who you are authenticated as
    Whoami,
    /// Manage applications
    Apps {
        #[command(subcommand)]
        cmd: commands::apps::AppCommands,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Login => commands::auth::login().await?,
        Commands::Whoami => commands::auth::whoami().await?,
        Commands::Apps { cmd } => commands::apps::handle(cmd).await?,
    }

    Ok(())
}
