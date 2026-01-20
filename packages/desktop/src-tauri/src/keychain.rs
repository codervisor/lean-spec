use tauri::{AppHandle, Manager};
use tauri_plugin_stronghold::stronghold::Stronghold;

use crate::config::read_config;

const CLIENT_PATH: &[u8] = b"leanspec-chat";

fn stronghold_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|dir| dir.join("chat-keys.stronghold"))
        .map_err(|error| error.to_string())
}

fn stronghold_password() -> Result<Vec<u8>, String> {
    read_config()
        .keychain_secret
        .ok_or_else(|| "Missing keychain secret".to_string())
        .map(|secret| secret.into_bytes())
}

fn open_stronghold(app: &AppHandle) -> Result<Stronghold, String> {
    let path = stronghold_path(app)?;
    let password = stronghold_password()?;
    Stronghold::new(path, password).map_err(|error| error.to_string())
}

fn get_or_create_client(stronghold: &Stronghold) -> Result<iota_stronghold::Client, String> {
    stronghold
        .get_client(CLIENT_PATH)
        .or_else(|_| stronghold.create_client(CLIENT_PATH))
        .map_err(|error| error.to_string())
}

pub fn store_api_key(app: &AppHandle, provider_id: &str, api_key: &str) -> Result<(), String> {
    let stronghold = open_stronghold(app)?;
    let client = get_or_create_client(&stronghold)?;
    client
        .store()
        .insert(
            provider_id.as_bytes().to_vec(),
            api_key.as_bytes().to_vec(),
            None,
        )
        .map_err(|error| error.to_string())?;
    stronghold.save().map_err(|error| error.to_string())?;
    Ok(())
}

pub fn get_api_key(app: &AppHandle, provider_id: &str) -> Result<Option<String>, String> {
    let stronghold = open_stronghold(app)?;
    let client = get_or_create_client(&stronghold)?;
    let value = client
        .store()
        .get(provider_id.as_bytes())
        .map_err(|error| error.to_string())?;
    let value = value.and_then(|bytes| String::from_utf8(bytes).ok());
    Ok(value)
}

pub fn delete_api_key(app: &AppHandle, provider_id: &str) -> Result<(), String> {
    let stronghold = open_stronghold(app)?;
    let client = get_or_create_client(&stronghold)?;
    client
        .store()
        .delete(provider_id.as_bytes())
        .map_err(|error| error.to_string())?;
    stronghold.save().map_err(|error| error.to_string())?;
    Ok(())
}
