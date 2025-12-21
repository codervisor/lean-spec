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
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/stats").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("total"));
    assert!(body.contains("byStatus"));
    assert!(body.contains("byPriority"));
}

#[tokio::test]
async fn test_stats_camel_case_structure_and_counts() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app.clone(), "GET", "/api/stats").await;

    assert_eq!(status, StatusCode::OK);
    let stats: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(stats["total"], 3);

    let by_status = stats["byStatus"].as_object().unwrap();
    assert_eq!(by_status.get("planned").and_then(|v| v.as_u64()), Some(1));
    assert_eq!(
        by_status.get("inProgress").and_then(|v| v.as_u64()),
        Some(1)
    );
    assert_eq!(by_status.get("complete").and_then(|v| v.as_u64()), Some(1));
    assert!(by_status.get("in_progress").is_none());

    let by_priority = stats["byPriority"].as_object().unwrap();
    assert_eq!(by_priority.get("high").and_then(|v| v.as_u64()), Some(1));
    assert_eq!(by_priority.get("medium").and_then(|v| v.as_u64()), Some(1));
    assert_eq!(by_priority.get("low").and_then(|v| v.as_u64()), Some(1));
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

    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/stats").await;

    assert_eq!(status, StatusCode::OK);
    let stats: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(stats["total"], 0);
    assert!(
        stats["byStatus"].as_object().unwrap().is_empty()
            || stats["byStatus"]
                .as_object()
                .unwrap()
                .values()
                .all(|v| v.as_u64() == Some(0))
    );
}
