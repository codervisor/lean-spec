use std::error::Error;
use std::path::Path;

pub fn detect_package_manager(dir: &Path) -> Result<String, Box<dyn Error>> {
    // Check for lockfiles
    if dir.join("pnpm-lock.yaml").exists() {
        return Ok("pnpm".to_string());
    }
    if dir.join("yarn.lock").exists() {
        return Ok("yarn".to_string());
    }
    if dir.join("package-lock.json").exists() {
        return Ok("npm".to_string());
    }

    // Check parent directories
    let mut current = dir.to_path_buf();
    while let Some(parent) = current.parent() {
        if parent.join("pnpm-lock.yaml").exists() {
            return Ok("pnpm".to_string());
        }
        if parent.join("yarn.lock").exists() {
            return Ok("yarn".to_string());
        }
        if parent.join("package-lock.json").exists() {
            return Ok("npm".to_string());
        }
        current = parent.to_path_buf();
    }

    // Default to npm
    Ok("npm".to_string())
}
