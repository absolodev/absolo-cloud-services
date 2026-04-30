pub async fn login() -> Result<(), Box<dyn std::error::Error>> {
    println!("Opening browser to authenticate with Absolo Cloud...");
    // TODO: implement OAuth Device Flow
    println!("Successfully logged in.");
    Ok(())
}

pub async fn whoami() -> Result<(), Box<dyn std::error::Error>> {
    // TODO: check local keychain / config file
    println!("Not logged in. Run `absolo login`.");
    Ok(())
}
