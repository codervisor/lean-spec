use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::chat_store::{ChatMessageInput, ChatSession, ChatStorageInfo};
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListSessionsQuery {
    pub project_id: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionRequest {
    pub project_id: String,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionRequest {
    pub title: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceMessagesRequest {
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    pub messages: Vec<ChatMessageInput>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionWithMessagesResponse {
    pub session: ChatSession,
    pub messages: Vec<crate::chat_store::ChatMessage>,
}

pub async fn list_chat_sessions(
    State(state): State<AppState>,
    Query(query): Query<ListSessionsQuery>,
) -> ApiResult<Json<Vec<ChatSession>>> {
    let project_id = match query.project_id {
        Some(value) => value,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request("projectId is required")),
            ));
        }
    };

    let sessions = state.chat_store.list_sessions(&project_id).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e)),
        )
    })?;

    Ok(Json(sessions))
}

pub async fn create_chat_session(
    State(state): State<AppState>,
    Json(payload): Json<CreateSessionRequest>,
) -> ApiResult<Json<ChatSession>> {
    let session = state
        .chat_store
        .create_session(
            &uuid::Uuid::new_v4().to_string(),
            &payload.project_id,
            payload.provider_id,
            payload.model_id,
        )
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e)),
            )
        })?;

    Ok(Json(session))
}

pub async fn get_chat_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<SessionWithMessagesResponse>> {
    let session = state
        .chat_store
        .get_session(&session_id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e)),
            )
        })?;

    let Some(session) = session else {
        return Err((StatusCode::NOT_FOUND, Json(ApiError::not_found("Session"))));
    };

    let messages = state
        .chat_store
        .get_messages(&session_id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e)),
            )
        })?;

    Ok(Json(SessionWithMessagesResponse { session, messages }))
}

pub async fn update_chat_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(payload): Json<UpdateSessionRequest>,
) -> ApiResult<Json<ChatSession>> {
    let session = state
        .chat_store
        .update_session(&session_id, payload.title, payload.provider_id, payload.model_id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e)),
            )
        })?;

    let Some(session) = session else {
        return Err((StatusCode::NOT_FOUND, Json(ApiError::not_found("Session"))));
    };

    Ok(Json(session))
}

pub async fn delete_chat_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> ApiResult<Json<serde_json::Value>> {
    let deleted = state
        .chat_store
        .delete_session(&session_id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e)),
            )
        })?;

    if !deleted {
        return Err((StatusCode::NOT_FOUND, Json(ApiError::not_found("Session"))));
    }

    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn replace_chat_messages(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(payload): Json<ReplaceMessagesRequest>,
) -> ApiResult<Json<ChatSession>> {
    let session = state
        .chat_store
        .replace_messages(&session_id, payload.provider_id, payload.model_id, payload.messages)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e)),
            )
        })?;

    let Some(session) = session else {
        return Err((StatusCode::NOT_FOUND, Json(ApiError::not_found("Session"))));
    };

    Ok(Json(session))
}

pub async fn get_chat_storage_info(
    State(state): State<AppState>,
) -> ApiResult<Json<ChatStorageInfo>> {
    let info = state.chat_store.storage_info().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e)),
        )
    })?;

    Ok(Json(info))
}
