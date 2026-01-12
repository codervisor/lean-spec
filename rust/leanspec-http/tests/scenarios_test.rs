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

    let registry_dir = TempDir::new().unwrap();

    let state = create_empty_state(&registry_dir).await;
    let app = create_router(state);

    // Add first project
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

    // Add second project
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

    // Verify both projects are listed
    let (_, body) = make_request(app.clone(), "GET", "/api/projects").await;
    let projects: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(projects["projects"].as_array().unwrap().len(), 2);

    // Verify we can access both projects
    let (status, _) =
        make_request(app.clone(), "GET", &format!("/api/projects/{}", first_id)).await;
    assert_eq!(status, StatusCode::OK);

    let (status, _) =
        make_request(app.clone(), "GET", &format!("/api/projects/{}", second_id)).await;
    assert_eq!(status, StatusCode::OK);

    // Delete second project directory
    assert!(fs::remove_dir_all(second_project.path()).is_ok());
    std::thread::sleep(std::time::Duration::from_millis(10));
    assert!(!second_project.path().exists());

    // Refresh projects to clean up deleted project
    let (status, body) = make_request(app.clone(), "POST", "/api/projects/refresh").await;
    assert_eq!(status, StatusCode::OK);
    let refresh: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(refresh["removed"].as_u64(), Some(1));

    // Verify only first project remains
    let (_, body) = make_request(app.clone(), "GET", "/api/projects").await;
    let projects: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(projects["projects"].as_array().unwrap().len(), 1);

    // Verify first project still accessible
    let (status, _) =
        make_request(app.clone(), "GET", &format!("/api/projects/{}", first_id)).await;
    assert_eq!(status, StatusCode::OK);

    // Verify second project is gone
    let (status, _) =
        make_request(app.clone(), "GET", &format!("/api/projects/{}", second_id)).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
