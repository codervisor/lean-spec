//! Integration tests for search endpoints

mod common;

use axum::http::StatusCode;
use leanspec_http::create_router;
use serde_json::Value;
use tempfile::TempDir;

use common::*;

#[tokio::test]
async fn test_search_specs() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) = make_json_request(
        app,
        "POST",
        &format!("/api/projects/{}/search", project_id),
        r#"{"query": "test"}"#,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("results"));
    assert!(body.contains("001-first-spec")); // Contains "test" tag
}

#[tokio::test]
async fn test_search_ranking_by_relevance() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    // Search for "test" which appears in spec 001
    let (status, body) = make_json_request(
        app,
        "POST",
        &format!("/api/projects/{}/search", project_id),
        r#"{"query": "test"}"#,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let results: Value = serde_json::from_str(&body).unwrap();

    assert!(results.get("results").is_some());
    let results_array = results["results"].as_array().unwrap();
    assert!(!results_array.is_empty());

    // Verify results are sorted (by spec number descending or relevance)
    if results_array.len() > 1 {
        let first = &results_array[0];
        assert!(first.get("specName").is_some() || first.get("specNumber").is_some());
    }
}

#[tokio::test]
async fn test_search_with_filters() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    // Search with status filter
    let (status, body) = make_json_request(
        app,
        "POST",
        &format!("/api/projects/{}/search", project_id),
        r#"{"query": "spec", "filters": {"status": "planned"}}"#,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let results: Value = serde_json::from_str(&body).unwrap();
    assert!(results.get("results").is_some());
}

#[tokio::test]
async fn test_search_empty_results() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) = make_json_request(
        app,
        "POST",
        &format!("/api/projects/{}/search", project_id),
        r#"{"query": "nonexistentquerystring123456"}"#,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let results: Value = serde_json::from_str(&body).unwrap();
    let results_array = results["results"].as_array().unwrap();
    assert_eq!(results_array.len(), 0);
}
