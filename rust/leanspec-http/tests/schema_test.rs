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
