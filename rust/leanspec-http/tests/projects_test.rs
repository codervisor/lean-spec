//! Integration tests for project management endpoints

mod common;

use axum::http::StatusCode;
use leanspec_http::create_router;
use serde_json::Value;
use tempfile::TempDir;

use common::*;

#[tokio::test]
async fn test_health_endpoint() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/health").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("ok"));
    assert!(body.contains("version"));
}

#[tokio::test]
async fn test_list_projects() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/projects").await;

    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("projects"));
}

#[tokio::test]
async fn test_add_project_and_get_detail() {
    let temp_dir = TempDir::new().unwrap();
    create_test_project(temp_dir.path());

    let state = create_empty_state().await;
    let app = create_router(state);

    let (status, body) = make_json_request(
        app.clone(),
        "POST",
        "/api/projects",
        &serde_json::json!({ "path": temp_dir.path().to_string_lossy() }).to_string(),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let project: Value = serde_json::from_str(&body).unwrap();
    let project_id = project["id"].as_str().unwrap();
    assert!(project.get("specsDir").is_some());
    assert!(project.get("lastAccessed").is_some());
    assert!(project.get("addedAt").is_some());

    let (status, body) = make_request(app.clone(), "GET", "/api/projects").await;
    assert_eq!(status, StatusCode::OK);
    let projects: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(projects["projects"].as_array().unwrap().len(), 1);
    assert_eq!(projects["currentProjectId"].as_str(), Some(project_id));
}

#[tokio::test]
async fn test_update_project_and_toggle_favorite() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app.clone(), "GET", "/api/projects").await;
    assert_eq!(status, StatusCode::OK);
    let projects: Value = serde_json::from_str(&body).unwrap();
    let project_id = projects["projects"][0]["id"].as_str().unwrap();

    let (status, body) = make_json_request(
        app.clone(),
        "PATCH",
        &format!("/api/projects/{project_id}"),
        &serde_json::json!({
            "name": "Updated Project",
            "favorite": true,
            "color": "#ffcc00"
        })
        .to_string(),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let updated: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(updated["name"], "Updated Project");
    assert_eq!(updated["favorite"], true);
    assert_eq!(updated["color"], "#ffcc00");

    let (status, body) = make_request(
        app.clone(),
        "POST",
        &format!("/api/projects/{project_id}/favorite"),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let toggled: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(toggled["favorite"], false);
}

#[tokio::test]
async fn test_project_not_found() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, body) = make_request(app, "GET", "/api/projects/nonexistent-project-id").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(body.contains("PROJECT_NOT_FOUND") || body.contains("not found"));
}

#[tokio::test]
async fn test_delete_nonexistent_project() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, _body) = make_request(app, "DELETE", "/api/projects/nonexistent-project-id").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_switch_to_nonexistent_project() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, _body) =
        make_request(app, "POST", "/api/projects/nonexistent-project-id/switch").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_add_invalid_project_path() {
    let state = create_empty_state().await;
    let app = create_router(state);

    let (status, _body) = make_json_request(
        app,
        "POST",
        "/api/projects",
        &serde_json::json!({ "path": "/nonexistent/path/to/project" }).to_string(),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_update_nonexistent_project() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, _body) = make_json_request(
        app,
        "PATCH",
        "/api/projects/nonexistent-id",
        &serde_json::json!({ "name": "New Name" }).to_string(),
    )
    .await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}
