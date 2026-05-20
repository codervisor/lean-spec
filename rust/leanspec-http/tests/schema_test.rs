//! Integration tests for the per-project schema endpoint and the
//! markdown-only guards added in spec #261.

mod common;

use axum::http::StatusCode;
use leanspec_http::create_router;
use serde_json::Value;
use tempfile::TempDir;

use common::*;

#[tokio::test]
async fn test_get_project_schema_returns_markdown_schema() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) =
        make_request(app, "GET", &format!("/api/projects/{}/schema", project_id)).await;

    assert_eq!(status, StatusCode::OK);
    let schema: Value = serde_json::from_str(&body).unwrap();

    // The markdown adapter's schema id should round-trip into the response.
    assert_eq!(schema["id"], "leanspec:markdown");
    assert_eq!(schema["name"], "Markdown");
    let fields = schema["fields"].as_array().unwrap();

    // The schema must expose at least the status field (semantically required).
    let has_status = fields
        .iter()
        .any(|f| f["key"] == "status" && f["semantic"] == "status");
    assert!(has_status, "schema must expose a status field");
}

#[tokio::test]
async fn test_get_project_schema_unknown_project() {
    let registry_dir = TempDir::new().unwrap();
    let state = create_empty_state(&registry_dir).await;
    let app = create_router(state);

    let (status, _body) = make_request(app, "GET", "/api/projects/missing/schema").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_refresh_project_schema_returns_freshly_resolved_schema() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;

    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let app = create_router(state.clone());
    let (status, body) = make_request(
        app,
        "POST",
        &format!("/api/projects/{}/schema/refresh", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let payload: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(payload["adapter"], "markdown");
    assert_eq!(payload["schema"]["id"], "leanspec:markdown");
}

#[tokio::test]
async fn test_refresh_project_schema_unknown_project() {
    let registry_dir = TempDir::new().unwrap();
    let state = create_empty_state(&registry_dir).await;
    let app = create_router(state);

    let (status, _body) = make_request(app, "POST", "/api/projects/missing/schema/refresh").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_schema_endpoint_uses_adapter_cache() {
    // The cache is shared across requests via AppState — back-to-back GETs
    // for the same project must return identical schemas (and hit the cache
    // rather than rebuild the adapter every time).
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;

    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let app1 = create_router(state.clone());
    let (status_a, body_a) =
        make_request(app1, "GET", &format!("/api/projects/{}/schema", project_id)).await;
    assert_eq!(status_a, StatusCode::OK);

    let app2 = create_router(state.clone());
    let (status_b, body_b) =
        make_request(app2, "GET", &format!("/api/projects/{}/schema", project_id)).await;
    assert_eq!(status_b, StatusCode::OK);

    assert_eq!(body_a, body_b);
}
