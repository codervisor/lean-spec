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

    let registry_dir = TempDir::new().unwrap();

    let state = create_empty_state(&registry_dir).await;
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

    // Verify the project is in the list
    let project_in_list = &projects["projects"][0];
    assert_eq!(project_in_list["id"].as_str().unwrap(), project_id);
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
async fn test_add_invalid_project_path() {
    let registry_dir = TempDir::new().unwrap();
    let state = create_empty_state(&registry_dir).await;
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

#[tokio::test]
async fn test_get_project_context() {
    let temp_dir = TempDir::new().unwrap();

    // Create project with context files
    create_test_project(temp_dir.path());

    // Create AGENTS.md
    std::fs::write(
        temp_dir.path().join("AGENTS.md"),
        "# Agent Instructions\n\nThis is a test project.",
    )
    .unwrap();

    // Create README.md
    std::fs::write(
        temp_dir.path().join("README.md"),
        "# Test Project\n\nTest project for context API.",
    )
    .unwrap();

    // Create .lean-spec/config.json
    std::fs::create_dir_all(temp_dir.path().join(".lean-spec")).unwrap();
    std::fs::write(
        temp_dir.path().join(".lean-spec/config.json"),
        r#"{"template":"default","specsDir":"specs"}"#,
    )
    .unwrap();

    let registry_dir = TempDir::new().unwrap();

    let state = create_empty_state(&registry_dir).await;
    let app = create_router(state);

    // Add project
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

    // Get project context
    let (status, body) = make_request(
        app.clone(),
        "GET",
        &format!("/api/projects/{}/context", project_id),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let context: Value = serde_json::from_str(&body).unwrap();

    // Verify structure
    assert!(context.get("agentInstructions").is_some());
    assert!(context.get("config").is_some());
    assert!(context.get("projectDocs").is_some());
    assert!(context.get("totalTokens").is_some());
    assert!(context.get("projectRoot").is_some());

    // Verify agent instructions includes AGENTS.md
    let agent_instructions = context["agentInstructions"].as_array().unwrap();
    assert!(!agent_instructions.is_empty());
    assert!(agent_instructions.iter().any(|f| f["name"] == "AGENTS.md"));

    // Verify project docs includes README.md
    let project_docs = context["projectDocs"].as_array().unwrap();
    assert!(!project_docs.is_empty());
    assert!(project_docs.iter().any(|f| f["name"] == "README.md"));

    // Verify config is parsed
    let config = &context["config"];
    assert!(config["file"].is_object());
    assert!(config["parsed"].is_object());
    assert_eq!(config["parsed"]["template"], "default");
}

#[tokio::test]
async fn test_get_project_context_not_found() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let app = create_router(state);

    let (status, _body) = make_request(app, "GET", "/api/projects/nonexistent-id/context").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
}
