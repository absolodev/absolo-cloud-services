use crate::config::Config;
use std::io::{self, Write};

pub async fn login() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = Config::load()?;

    // In a real CLI, we would do an OAuth device flow or open browser
    // For Phase 1 we will just prompt for a token

    print!("Absolo Personal Access Token: ");
    io::stdout().flush()?;

    let mut token = String::new();
    io::stdin().read_line(&mut token)?;

    let token = token.trim().to_string();
    if token.is_empty() {
        println!("Token cannot be empty.");
        return Ok(());
    }

    config.token = Some(token);
    config.save()?;

    println!("Successfully logged in.");
    Ok(())
}

pub async fn whoami() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::load()?;

    if let Some(_) = config.token {
        // We would call /v1/iam/whoami here via REST
        println!("Authenticated. (TODO: fetch dynamic identity)");
    } else {
        println!("Not logged in. Run `absolo login`.");
    }

    Ok(())
}
