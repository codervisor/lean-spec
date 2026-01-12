//! Integration tests for statistics endpoints

mod common;

use axum::http::StatusCode;
use leanspec_http::create_router;
use serde_json::Value;
use tempfile::TempDir;

use common::*;

#[tokio::test]
async fn test_get_stats() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) =
        make_request(app, "GET", &format!("/api/projects/{}/stats", project_id)).await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("totalSpecs"));
    assert!(body.contains("specsByStatus"));
    assert!(body.contains("specsByPriority"));
}

#[tokio::test]
async fn test_stats_camel_case_structure_and_counts() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) = make_request(
        app.clone(),
        "GET",
        &format!("/api/projects/{}/stats", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let stats: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(stats["totalSpecs"], 3);

    // Verify the response structure matches camelCase API format
    let by_status = stats["specsByStatus"].as_array().unwrap();
    let planned = by_status.iter().find(|s| s["status"] == "planned").unwrap();
    assert_eq!(planned["count"], 1);

    let in_progress = by_status
        .iter()
        .find(|s| s["status"] == "in-progress")
        .unwrap();
    assert_eq!(in_progress["count"], 1);

    let complete = by_status
        .iter()
        .find(|s| s["status"] == "complete")
        .unwrap();
    assert_eq!(complete["count"], 1);

    let by_priority = stats["specsByPriority"].as_array().unwrap();
    assert_eq!(by_priority.len(), 4); // low, medium, high, critical
}

#[tokio::test]
async fn test_empty_project_stats() {
    let temp_dir = TempDir::new().unwrap();
    create_empty_project(temp_dir.path());

    let config = leanspec_http::ServerConfig::default();
    let registry = leanspec_http::ProjectRegistry::default();
    let state = leanspec_http::AppState::with_registry(config, registry);
    {
        let mut reg = state.registry.write().await;
        let _ = reg.add(temp_dir.path());
    }

    let app = create_router(state.clone());

    // Get project ID
    let project_id = {
        let reg = state.registry.read().await;
        let projects = reg.all();
        projects.first().unwrap().id.clone()
    };

    let (status, body) =
        make_request(app, "GET", &format!("/api/projects/{}/stats", project_id)).await;

    assert_eq!(status, StatusCode::OK);
    let stats: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(stats["totalSpecs"], 0);
    let by_status = stats["specsByStatus"].as_array().unwrap();
    assert!(by_status.iter().all(|v| v["count"] == 0));
}
