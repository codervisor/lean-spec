//! Integration tests for multi-project scenarios

mod common;

use axum::http::StatusCode;
use leanspec_http::create_router;
use serde_json::Value;
use std::fs;
use tempfile::TempDir;

use common::*;

#[tokio::test]
async fn test_switch_project_and_refresh_cleanup() {
    let first_project = TempDir::new().unwrap();
    let second_project = TempDir::new().unwrap();
    create_test_project(first_project.path());
    create_test_project(second_project.path());

    let state = create_empty_state().await;
    let app = create_router(state);

    let (_, body) = make_json_request(
        app.clone(),
        "POST",
        "/api/projects",
        &serde_json::json!({ "path": first_project.path().to_string_lossy() }).to_string(),
    )
    .await;
    let first_id = serde_json::from_str::<Value>(&body).unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    let (_, body) = make_json_request(
        app.clone(),
        "POST",
        "/api/projects",
        &serde_json::json!({ "path": second_project.path().to_string_lossy() }).to_string(),
    )
    .await;
    let second_id = serde_json::from_str::<Value>(&body).unwrap()["id"]
        .as_str()
        .unwrap()
        .to_string();

    let (_, body) = make_request(app.clone(), "GET", "/api/projects").await;
    let projects: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(
        projects["currentProjectId"].as_str(),
        Some(second_id.as_str())
    );

    let (status, body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/projects/{first_id}/switch"),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let switched: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(switched["id"], first_id);

    assert!(fs::remove_dir_all(second_project.path()).is_ok());
    std::thread::sleep(std::time::Duration::from_millis(10));
    assert!(!second_project.path().exists());
    let (status, body) = make_request(app.clone(), "POST", "/api/projects/refresh").await;
    assert_eq!(status, StatusCode::OK);
    let refresh: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(refresh["removed"].as_u64(), Some(1));

    let (_, body) = make_request(app.clone(), "GET", "/api/projects").await;
    let projects: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(projects["projects"].as_array().unwrap().len(), 1);
    assert_eq!(
        projects["currentProjectId"].as_str(),
        Some(first_id.as_str())
    );
}
