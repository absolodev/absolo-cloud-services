use std::path::Path;
use std::process::Stdio;
use tokio::fs;
use tokio::process::Command;
use tracing::{info, warn};

pub async fn detect_and_build(
    app_id: &str,
    deployment_id: &str,
    source_path: &Path,
    registry_url: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let dockerfile_path = source_path.join("Dockerfile");
    let image_tag = format!("{}/apps/{}:{}", registry_url, app_id, deployment_id);

    if fs::metadata(&dockerfile_path).await.is_ok() {
        info!(
            "Detected Dockerfile. Building with 'docker build' for {}",
            image_tag
        );
        build_with_docker(source_path, &image_tag).await?;
    } else {
        info!(
            "No Dockerfile detected. Proceeding with Cloud Native Buildpacks (pack) for {}",
            image_tag
        );
        build_with_pack(source_path, &image_tag).await?;
    }

    Ok(image_tag)
}

async fn build_with_docker(
    source_path: &Path,
    image_tag: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let status = Command::new("docker")
        .arg("build")
        .arg("-t")
        .arg(image_tag)
        .arg(".")
        .current_dir(source_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .status()
        .await?;

    if !status.success() {
        warn!("docker build failed");
        return Err("Docker build failed".into());
    }

    info!("docker build succeeded. Pushing to registry...");
    let push_status = Command::new("docker")
        .arg("push")
        .arg(image_tag)
        .status()
        .await?;

    if !push_status.success() {
        return Err("docker push failed".into());
    }

    Ok(())
}

async fn build_with_pack(
    source_path: &Path,
    image_tag: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let status = Command::new("pack")
        .arg("build")
        .arg(image_tag)
        .arg("--builder")
        .arg("paketobuildpacks/builder-jammy-base")
        .arg("--publish")
        .current_dir(source_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .status()
        .await?;

    if !status.success() {
        warn!("pack build failed");
        return Err("Pack build failed".into());
    }

    info!("pack build and publish succeeded for {}", image_tag);

    Ok(())
}
