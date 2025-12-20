//! End-to-end integration tests with actual HTTP server
//!
//! These tests start a real HTTP server and make network requests to it,
//! testing the full stack including server startup, routing, and shutdown.

mod common;

use leanspec_http::state::AppState;
use reqwest::{Client, StatusCode};
use std::net::SocketAddr;
use std::time::Duration;
use tempfile::TempDir;
use tokio::net::TcpListener;

use common::*;

/// Start a test HTTP server on a random available port
async fn start_test_server(state: AppState) -> (SocketAddr, tokio::task::JoinHandle<()>) {
    // Bind to port 0 to get a random available port
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    let app = leanspec_http::create_router(state);

    let handle = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    // Give the server a moment to start
    tokio::time::sleep(Duration::from_millis(100)).await;

    (addr, handle)
}

#[tokio::test]
async fn test_server_health_endpoint() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let (addr, handle) = start_test_server(state).await;

    let client = Client::new();
    let response = client
        .get(format!("http://{}/health", addr))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["status"], "ok");
    assert!(body["version"].is_string());

    // Cleanup
    handle.abort();
}

#[tokio::test]
async fn test_server_list_projects() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let (addr, handle) = start_test_server(state).await;

    let client = Client::new();
    let response = client
        .get(format!("http://{}/api/projects", addr))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert!(body["projects"].is_array());

    // Cleanup
    handle.abort();
}

#[tokio::test]
async fn test_server_add_and_remove_project() {
    let temp_dir = TempDir::new().unwrap();
    create_test_project(temp_dir.path());

    let state = create_empty_state().await;
    let (addr, handle) = start_test_server(state).await;

    let client = Client::new();

    // Add project
    let add_response = client
        .post(format!("http://{}/api/projects", addr))
        .json(&serde_json::json!({ "path": temp_dir.path().to_string_lossy() }))
        .send()
        .await
        .unwrap();

    assert_eq!(add_response.status(), StatusCode::OK);
    let add_body: serde_json::Value = add_response.json().await.unwrap();
    let project_id = add_body["project"]["id"].as_str().unwrap();

    // Verify project exists
    let list_response = client
        .get(format!("http://{}/api/projects", addr))
        .send()
        .await
        .unwrap();

    let list_body: serde_json::Value = list_response.json().await.unwrap();
    let projects = list_body["projects"].as_array().unwrap();
    assert_eq!(projects.len(), 1);

    // Remove project
    let remove_response = client
        .delete(format!("http://{}/api/projects/{}", addr, project_id))
        .send()
        .await
        .unwrap();

    assert_eq!(remove_response.status(), StatusCode::OK);

    // Verify project was removed
    let final_list = client
        .get(format!("http://{}/api/projects", addr))
        .send()
        .await
        .unwrap();

    let final_body: serde_json::Value = final_list.json().await.unwrap();
    let final_projects = final_body["projects"].as_array().unwrap();
    assert_eq!(final_projects.len(), 0);

    // Cleanup
    handle.abort();
}

#[tokio::test]
async fn test_server_get_specs() {
    let temp_dir = TempDir::new().unwrap();
    create_test_project(temp_dir.path());

    let state = create_empty_state().await;
    let (addr, handle) = start_test_server(state).await;

    let client = Client::new();

    // Add project
    let add_response = client
        .post(format!("http://{}/api/projects", addr))
        .json(&serde_json::json!({ "path": temp_dir.path().to_string_lossy() }))
        .send()
        .await
        .unwrap();

    let add_body: serde_json::Value = add_response.json().await.unwrap();
    let project_id = add_body["project"]["id"].as_str().unwrap();

    // Get specs
    let specs_response = client
        .get(format!("http://{}/api/projects/{}/specs", addr, project_id))
        .send()
        .await
        .unwrap();

    assert_eq!(specs_response.status(), StatusCode::OK);
    let specs_body: serde_json::Value = specs_response.json().await.unwrap();
    assert!(specs_body["specs"].is_array());

    // Cleanup
    handle.abort();
}

#[tokio::test]
async fn test_server_cors_headers() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let (addr, handle) = start_test_server(state).await;

    let client = Client::new();
    let response = client
        .get(format!("http://{}/api/projects", addr))
        .header("Origin", "http://localhost:3000")
        .send()
        .await
        .unwrap();

    // CORS should be enabled by default - check response headers
    assert!(response
        .headers()
        .get("access-control-allow-origin")
        .is_some());

    // Cleanup
    handle.abort();
}

#[tokio::test]
async fn test_server_error_handling() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let (addr, handle) = start_test_server(state).await;

    let client = Client::new();

    // Try to get a non-existent project
    let response = client
        .get(format!("http://{}/api/projects/nonexistent-id/specs", addr))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Cleanup
    handle.abort();
}

#[tokio::test]
async fn test_server_concurrent_requests() {
    let temp_dir = TempDir::new().unwrap();
    let state = create_test_state(&temp_dir).await;
    let (addr, handle) = start_test_server(state).await;

    let client = Client::new();

    // Make multiple concurrent requests
    let mut tasks = vec![];
    for _ in 0..10 {
        let client = client.clone();
        let url = format!("http://{}/health", addr);
        tasks.push(tokio::spawn(async move {
            client.get(&url).send().await.unwrap()
        }));
    }

    // Wait for all requests to complete
    for task in tasks {
        let response = task.await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // Cleanup
    handle.abort();
}
