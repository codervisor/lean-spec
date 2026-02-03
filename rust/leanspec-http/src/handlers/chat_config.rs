use axum::{extract::State, Json};

use crate::chat_config::{ChatConfigClient, ChatConfigUpdate};
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

pub async fn get_chat_config(State(state): State<AppState>) -> ApiResult<Json<ChatConfigClient>> {
    let config = state.chat_config.read().await.client_config();
    Ok(Json(config))
}

pub async fn update_chat_config(
    State(state): State<AppState>,
    Json(update): Json<ChatConfigUpdate>,
) -> ApiResult<Json<ChatConfigClient>> {
    let mut store = state.chat_config.write().await;
    store.update(update).map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    // Use the already-held store to get client_config instead of acquiring another lock
    let config = store.client_config();
    Ok(Json(config))
}
