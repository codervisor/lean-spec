use sha2::{Digest, Sha256};

/// Compute a SHA-256 hash for spec content.
pub fn hash_content(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}
