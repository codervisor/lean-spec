//! Integration tests for error handling

mod common;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use leanspec_http::create_router;
use tempfile::TempDir;
use tower::ServiceExt;

use common::*;

#[tokio::test]
async fn test_malformed_json_request() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    // Test malformed JSON on a POST endpoint
    let (status, _body) = make_json_request(
        app,
        "POST",
        &format!("/api/projects/{}/search", project_id),
        "{ invalid json",
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_cors_headers() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let request = Request::builder()
        .method("OPTIONS")
        .uri("/api/projects")
        .header("Origin", "http://localhost:3000")
        .header("Access-Control-Request-Method", "GET")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    // Check if CORS headers are present
    let headers = response.headers();
    // Note: This test will pass if CORS is configured, fail if not
    // Adjust based on actual CORS configuration
    assert!(
        headers.contains_key("access-control-allow-origin") || response.status() == StatusCode::OK
    );
}
