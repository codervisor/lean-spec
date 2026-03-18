//! API key authentication middleware
//!
//! When `LEANSPEC_API_KEY` is set, all `/api/*` requests must include
//! a matching `Authorization: Bearer <token>` header. Health endpoints
//! are always exempt so orchestrators can probe liveness/readiness.

use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};

/// Paths that bypass authentication (health probes).
const AUTH_EXEMPT_PREFIXES: &[&str] = &["/health"];

/// Middleware that enforces bearer-token authentication when `LEANSPEC_API_KEY`
/// is configured. Uses constant-time comparison to prevent timing attacks.
pub async fn api_key_auth(req: Request<Body>, next: Next) -> Response {
    let expected = match std::env::var("LEANSPEC_API_KEY") {
        Ok(key) if !key.is_empty() => key,
        _ => return next.run(req).await, // No key configured — pass through
    };

    let path = req.uri().path();

    // Skip auth for health endpoints
    if AUTH_EXEMPT_PREFIXES
        .iter()
        .any(|prefix| path.starts_with(prefix))
    {
        return next.run(req).await;
    }

    // Only protect API routes
    if !path.starts_with("/api") {
        return next.run(req).await;
    }

    // Extract bearer token
    let token = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    match token {
        Some(token) if constant_time_eq(token.as_bytes(), expected.as_bytes()) => {
            next.run(req).await
        }
        Some(_) => (StatusCode::UNAUTHORIZED, "Invalid API key").into_response(),
        None => (StatusCode::UNAUTHORIZED, "Missing Authorization header").into_response(),
    }
}

/// Constant-time byte comparison to prevent timing attacks.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut result: u8 = 0;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn constant_time_eq_matches() {
        assert!(constant_time_eq(b"secret", b"secret"));
    }

    #[test]
    fn constant_time_eq_rejects_mismatch() {
        assert!(!constant_time_eq(b"secret", b"secreT"));
    }

    #[test]
    fn constant_time_eq_rejects_different_lengths() {
        assert!(!constant_time_eq(b"short", b"longer"));
    }
}
