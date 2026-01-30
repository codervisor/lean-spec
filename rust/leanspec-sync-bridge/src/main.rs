use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use clap::Parser;
use futures_util::{SinkExt, StreamExt};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tokio::time::{sleep, Duration};
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::Message;
use url::Url;
use uuid::Uuid;

use leanspec_core::{MetadataUpdate, SpecLoader, SpecPriority, SpecStatus, SpecWriter};
use leanspec_core::utils::hash_content;

#[derive(Parser, Debug)]
#[command(name = "leanspec-sync-bridge")]
#[command(about = "LeanSpec Sync Bridge")]
struct Args {
    /// Cloud server URL
    #[arg(long, default_value = "http://localhost:3333")]
    server_url: String,

    /// API key for headless/CI auth
    #[arg(long)]
    api_key: Option<String>,

    /// Project root paths to sync (repeatable)
    #[arg(long)]
    project: Vec<String>,

    /// Machine label (defaults to hostname)
    #[arg(long)]
    label: Option<String>,

    /// Allow insecure http (no TLS)
    #[arg(long)]
    allow_insecure: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeConfig {
    server_url: String,
    api_key: Option<String>,
    access_token: Option<String>,
    machine_id: String,
    machine_label: String,
    projects: Vec<ProjectConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectConfig {
    id: String,
    name: String,
    path: String,
    specs_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncEventsRequest {
    machine_id: String,
    machine_label: String,
    project_id: String,
    project_name: String,
    events: Vec<SyncEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
enum SyncEvent {
    Snapshot {
        specs: Vec<SpecRecord>,
    },
    SpecChanged {
        spec: Box<SpecRecord>,
    },
    SpecDeleted {
        spec_name: String,
    },
    Heartbeat {
        version: Option<String>,
        queue_depth: usize,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpecRecord {
    spec_name: String,
    title: Option<String>,
    status: String,
    priority: Option<String>,
    tags: Vec<String>,
    assignee: Option<String>,
    content_md: String,
    content_hash: String,
    created_at: Option<DateTime<Utc>>,
    updated_at: Option<DateTime<Utc>>,
    completed_at: Option<DateTime<Utc>>,
    depends_on: Vec<String>,
    file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
enum SyncCommand {
    ApplyMetadata {
        project_id: String,
        spec_name: String,
        status: Option<String>,
        priority: Option<String>,
        tags: Option<Vec<String>>,
        add_depends_on: Option<Vec<String>>,
        remove_depends_on: Option<Vec<String>>,
        parent: Option<Option<String>>,
        expected_content_hash: Option<String>,
    },
    RenameMachine {
        label: String,
    },
    RevokeMachine,
    ExecutionRequest {
        request_id: String,
        payload: serde_json::Value,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PendingCommand {
    id: String,
    command: SyncCommand,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
enum BridgeMessage {
    Hello {
        machine_id: String,
        machine_label: String,
        version: Option<String>,
    },
    CommandResult {
        command_id: String,
        status: String,
        message: Option<String>,
        current_content_hash: Option<String>,
    },
    Heartbeat {
        queue_depth: usize,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct QueuedEvent {
    project_id: String,
    project_name: String,
    event: SyncEvent,
}

struct BridgeState {
    config: BridgeConfig,
    project_map: HashMap<String, ProjectConfig>,
    queue: Vec<QueuedEvent>,
    queue_path: PathBuf,
    audit_path: PathBuf,
}

impl BridgeState {
    fn load_queue(&mut self) {
        if let Ok(content) = fs::read_to_string(&self.queue_path) {
            if let Ok(events) = serde_json::from_str::<Vec<QueuedEvent>>(&content) {
                self.queue = events;
            }
        }
    }

    fn save_queue(&self) {
        if let Some(parent) = self.queue_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(serialized) = serde_json::to_string_pretty(&self.queue) {
            let _ = fs::write(&self.queue_path, serialized);
        }
    }

    fn log_audit(&self, entry: &str) {
        if let Some(parent) = self.audit_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let line = format!("{} {}\n", Utc::now().to_rfc3339(), entry);
        let _ = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.audit_path)
            .and_then(|mut file| std::io::Write::write_all(&mut file, line.as_bytes()));
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    let mut config = load_config()?;

    if !args.project.is_empty() {
        let machine_id = config.machine_id.clone();
        config.projects = args
            .project
            .iter()
            .map(|path| build_project_config(path, &machine_id))
            .collect::<Result<Vec<_>>>()?;
    }

    if let Some(label) = args.label {
        config.machine_label = label;
    }

    if let Some(api_key) = args.api_key {
        config.api_key = Some(api_key);
    }

    config.server_url = args.server_url.clone();
    save_config(&config)?;

    if !config.server_url.starts_with("https://") && !args.allow_insecure {
        return Err(anyhow!("TLS required. Use --allow-insecure for http."));
    }

    let client = Client::new();
    let auth_header = ensure_auth(&client, &mut config).await?;
    save_config(&config)?;

    let queue_path = config_dir().join("bridge-queue.json");
    let audit_path = config_dir().join("bridge-audit.log");
    let project_map = config
        .projects
        .iter()
        .map(|proj| (proj.id.clone(), proj.clone()))
        .collect::<HashMap<_, _>>();

    let state = Arc::new(Mutex::new(BridgeState {
        config: config.clone(),
        project_map,
        queue: Vec::new(),
        queue_path,
        audit_path,
    }));

    {
        let mut locked = state.lock().await;
        locked.load_queue();
    }

    let (event_tx, mut event_rx) = mpsc::unbounded_channel::<QueuedEvent>();

    // Start file watchers
    for project in &config.projects {
        let tx = event_tx.clone();
        let specs_dir = PathBuf::from(project.specs_dir.clone());
        let project_id = project.id.clone();
        let project_name = project.name.clone();
        tokio::spawn(async move {
            if let Err(err) = watch_project(specs_dir, project_id, project_name, tx).await {
                eprintln!("Watcher error: {err}");
            }
        });
    }

    // Send initial snapshots
    for project in &config.projects {
        let specs = load_project_specs(&project.specs_dir)?;
        let event = QueuedEvent {
            project_id: project.id.clone(),
            project_name: project.name.clone(),
            event: SyncEvent::Snapshot { specs },
        };
        let _ = event_tx.send(event);
    }

    // Event sender loop
    let sender_state = state.clone();
    let sender_client = client.clone();
    let sender_header = auth_header.clone();
    tokio::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            if let Err(err) =
                send_event(&sender_client, &sender_state, &sender_header, event.clone()).await
            {
                let mut locked = sender_state.lock().await;
                locked.queue.push(event);
                locked.save_queue();
                eprintln!("Failed to send event, queued: {err}");
            } else {
                flush_queue(&sender_client, &sender_state, &sender_header)
                    .await
                    .ok();
            }
        }
    });

    // WebSocket command loop
    loop {
        if let Err(err) = connect_commands(&client, &state, &auth_header).await {
            eprintln!("Bridge disconnected: {err}");
            sleep(Duration::from_secs(5)).await;
        }
    }
}

async fn connect_commands(
    client: &Client,
    state: &Arc<Mutex<BridgeState>>,
    auth_header: &AuthHeader,
) -> Result<()> {
    let ws_url = {
        let locked = state.lock().await;
        let mut url = Url::parse(&locked.config.server_url)?;
        let scheme = if url.scheme() == "https" { "wss" } else { "ws" };
        url.set_scheme(scheme).map_err(|_| anyhow!("invalid url"))?;
        url.set_path("/api/sync/bridge/ws");
        url.to_string()
    };

    let mut request = ws_url.clone().into_client_request()?;
    if let Some((name, value)) = auth_header.as_header() {
        request.headers_mut().insert(name, value);
    }

    let (ws_stream, _) = tokio_tungstenite::connect_async(request).await?;
    let (mut write, mut read) = ws_stream.split();
    let (out_tx, mut out_rx) = mpsc::unbounded_channel::<Message>();

    tokio::spawn(async move {
        while let Some(msg) = out_rx.recv().await {
            let _ = write.send(msg).await;
        }
    });

    let hello = {
        let locked = state.lock().await;
        BridgeMessage::Hello {
            machine_id: locked.config.machine_id.clone(),
            machine_label: locked.config.machine_label.clone(),
            version: Some(env!("CARGO_PKG_VERSION").to_string()),
        }
    };

    out_tx.send(Message::Text(serde_json::to_string(&hello)?.into()))?;

    let heartbeat_state = state.clone();
    let heartbeat_tx = out_tx.clone();
    tokio::spawn(async move {
        loop {
            let queue_depth = { heartbeat_state.lock().await.queue.len() };
            let msg = BridgeMessage::Heartbeat { queue_depth };
            if heartbeat_tx
                .send(Message::Text(
                    serde_json::to_string(&msg).unwrap_or_default().into(),
                ))
                .is_err()
            {
                break;
            }
            sleep(Duration::from_secs(10)).await;
        }
    });

    while let Some(message) = read.next().await {
        let msg = message?;
        if let Message::Text(text) = msg {
            let command = serde_json::from_str::<PendingCommand>(&text)?;
            handle_command(state, client, auth_header, command, &out_tx).await?;
        }
    }

    Ok(())
}

async fn handle_command(
    state: &Arc<Mutex<BridgeState>>,
    client: &Client,
    auth_header: &AuthHeader,
    command: PendingCommand,
    out_tx: &mpsc::UnboundedSender<Message>,
) -> Result<()> {
    let response = match command.command {
        SyncCommand::ApplyMetadata {
            project_id,
            spec_name,
            status,
            priority,
            tags,
            add_depends_on,
            remove_depends_on,
            parent,
            expected_content_hash,
        } => {
            apply_metadata(
                state,
                &project_id,
                &spec_name,
                status,
                priority,
                tags,
                add_depends_on,
                remove_depends_on,
                parent,
                expected_content_hash,
            )
            .await
        }
        SyncCommand::RenameMachine { label } => {
            let mut locked = state.lock().await;
            locked.config.machine_label = label.clone();
            save_config(&locked.config)?;
            locked.log_audit(&format!("rename_machine: {}", label));
            Ok(CommandOutcome::success(None))
        }
        SyncCommand::RevokeMachine => {
            let mut locked = state.lock().await;
            locked.config.access_token = None;
            save_config(&locked.config)?;
            locked.log_audit("revoke_machine");
            Ok(CommandOutcome::success(None))
        }
        SyncCommand::ExecutionRequest {
            request_id,
            payload,
        } => {
            let locked = state.lock().await;
            locked.log_audit(&format!(
                "execution_request: {} payload={}",
                request_id, payload
            ));
            Ok(CommandOutcome::success(None))
        }
    }?;

    let result = BridgeMessage::CommandResult {
        command_id: command.id,
        status: response.status,
        message: response.message,
        current_content_hash: response.current_hash,
    };
    out_tx.send(Message::Text(serde_json::to_string(&result)?.into()))?;

    if let Some(event) = response.followup_event {
        send_event(client, state, auth_header, event).await.ok();
    }

    Ok(())
}

struct CommandOutcome {
    status: String,
    message: Option<String>,
    current_hash: Option<String>,
    followup_event: Option<QueuedEvent>,
}

impl CommandOutcome {
    fn success(event: Option<QueuedEvent>) -> Self {
        Self {
            status: "ok".to_string(),
            message: None,
            current_hash: None,
            followup_event: event,
        }
    }

    fn conflict(hash: String) -> Self {
        Self {
            status: "conflict".to_string(),
            message: Some("content hash mismatch".to_string()),
            current_hash: Some(hash),
            followup_event: None,
        }
    }
}

#[allow(clippy::too_many_arguments)]
async fn apply_metadata(
    state: &Arc<Mutex<BridgeState>>,
    project_id: &str,
    spec_name: &str,
    status: Option<String>,
    priority: Option<String>,
    tags: Option<Vec<String>>,
    add_depends_on: Option<Vec<String>>,
    remove_depends_on: Option<Vec<String>>,
    parent: Option<Option<String>>,
    expected_content_hash: Option<String>,
) -> Result<CommandOutcome> {
    let project = {
        let locked = state.lock().await;
        locked.project_map.get(project_id).cloned()
    }
    .ok_or_else(|| anyhow!("Project not found"))?;

    let specs_dir = PathBuf::from(project.specs_dir);
    let loader = SpecLoader::new(&specs_dir);
    let spec = loader
        .load(spec_name)?
        .ok_or_else(|| anyhow!("Spec not found"))?;

    let current_hash = hash_content(&spec.content);
    if let Some(expected) = expected_content_hash {
        if expected != current_hash {
            let locked = state.lock().await;
            locked.log_audit(&format!("apply_metadata conflict: {}", spec_name));
            return Ok(CommandOutcome::conflict(current_hash));
        }
    }

    let mut update = MetadataUpdate::new();
    let mut depends_on = spec.frontmatter.depends_on.clone();
    if let Some(status) = status {
        update = update.with_status(status.parse::<SpecStatus>().map_err(|e| anyhow!(e))?);
    }
    if let Some(priority) = priority {
        update = update.with_priority(priority.parse::<SpecPriority>().map_err(|e| anyhow!(e))?);
    }
    if let Some(tags) = tags {
        update = update.with_tags(tags);
    }
    let has_depends_updates = add_depends_on.is_some() || remove_depends_on.is_some();

    if let Some(additions) = add_depends_on {
        for dep in additions {
            if !depends_on.contains(&dep) {
                depends_on.push(dep);
            }
        }
    }
    if let Some(removals) = remove_depends_on {
        depends_on.retain(|dep| !removals.contains(dep));
    }
    if has_depends_updates {
        update = update.with_depends_on(depends_on);
    }
    if let Some(parent) = parent {
        update = update.with_parent(parent);
    }

    let writer = SpecWriter::new(&specs_dir);
    writer.update_metadata(spec_name, update)?;

    let updated = loader
        .load(spec_name)?
        .ok_or_else(|| anyhow!("Spec not found after update"))?;
    let record = spec_record_from_info(&updated);

    let event = QueuedEvent {
        project_id: project_id.to_string(),
        project_name: project.name,
        event: SyncEvent::SpecChanged {
            spec: Box::new(record),
        },
    };

    let locked = state.lock().await;
    locked.log_audit(&format!("apply_metadata ok: {}", spec_name));

    Ok(CommandOutcome::success(Some(event)))
}

async fn watch_project(
    specs_dir: PathBuf,
    project_id: String,
    project_name: String,
    event_tx: mpsc::UnboundedSender<QueuedEvent>,
) -> Result<()> {
    let (tx, mut rx) = mpsc::unbounded_channel();

    let mut watcher: RecommendedWatcher = notify::recommended_watcher(move |res| {
        if let Ok(event) = res {
            let _ = tx.send(event);
        }
    })?;

    watcher.watch(&specs_dir, RecursiveMode::Recursive)?;

    while let Some(event) = rx.recv().await {
        for path in event.paths {
            if let Some(spec_name) = extract_spec_name(&specs_dir, &path) {
                match event.kind {
                    notify::EventKind::Remove(_) => {
                        let _ = event_tx.send(QueuedEvent {
                            project_id: project_id.clone(),
                            project_name: project_name.clone(),
                            event: SyncEvent::SpecDeleted { spec_name },
                        });
                    }
                    _ => {
                        if let Ok(record) = load_single_spec(&specs_dir, &spec_name) {
                            let _ = event_tx.send(QueuedEvent {
                                project_id: project_id.clone(),
                                project_name: project_name.clone(),
                                event: SyncEvent::SpecChanged {
                                    spec: Box::new(record),
                                },
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

fn extract_spec_name(specs_dir: &Path, path: &Path) -> Option<String> {
    if !path.starts_with(specs_dir) {
        return None;
    }
    let relative = path.strip_prefix(specs_dir).ok()?;
    let mut components = relative.components();
    let first = components.next()?.as_os_str().to_str()?;
    Some(first.to_string())
}

fn load_project_specs(specs_dir: &str) -> Result<Vec<SpecRecord>> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all()?;
    Ok(specs.iter().map(spec_record_from_info).collect())
}

fn load_single_spec(specs_dir: &Path, spec_name: &str) -> Result<SpecRecord> {
    let loader = SpecLoader::new(specs_dir);
    let spec = loader
        .load(spec_name)?
        .ok_or_else(|| anyhow!("Spec not found"))?;
    Ok(spec_record_from_info(&spec))
}

fn spec_record_from_info(spec: &leanspec_core::SpecInfo) -> SpecRecord {
    SpecRecord {
        spec_name: spec.path.clone(),
        title: Some(spec.title.clone()),
        status: spec.frontmatter.status.to_string(),
        priority: spec.frontmatter.priority.map(|p| p.to_string()),
        tags: spec.frontmatter.tags.clone(),
        assignee: spec.frontmatter.assignee.clone(),
        content_md: spec.content.clone(),
        content_hash: hash_content(&spec.content),
        created_at: spec.frontmatter.created_at,
        updated_at: spec.frontmatter.updated_at,
        completed_at: spec.frontmatter.completed_at,
        depends_on: spec.frontmatter.depends_on.clone(),
        file_path: Some(spec.file_path.to_string_lossy().to_string()),
    }
}

#[derive(Clone)]
enum AuthHeader {
    ApiKey(String),
    Bearer(String),
}

impl AuthHeader {
    fn as_header(&self) -> Option<(reqwest::header::HeaderName, reqwest::header::HeaderValue)> {
        match self {
            AuthHeader::ApiKey(value) => {
                let header = reqwest::header::HeaderName::from_static("x-api-key");
                Some((header, reqwest::header::HeaderValue::from_str(value).ok()?))
            }
            AuthHeader::Bearer(value) => {
                let header = reqwest::header::AUTHORIZATION;
                let auth_value = format!("Bearer {}", value);
                Some((
                    header,
                    reqwest::header::HeaderValue::from_str(&auth_value).ok()?,
                ))
            }
        }
    }
}

async fn ensure_auth(client: &Client, config: &mut BridgeConfig) -> Result<AuthHeader> {
    if let Some(api_key) = &config.api_key {
        return Ok(AuthHeader::ApiKey(api_key.clone()));
    }

    if let Some(token) = &config.access_token {
        return Ok(AuthHeader::Bearer(token.clone()));
    }

    let device_code = request_device_code(client, config).await?;
    println!(
        "Open {} and enter code {}",
        device_code.verification_uri, device_code.user_code
    );

    let token = poll_device_token(client, config, &device_code).await?;
    config.access_token = Some(token.clone());
    Ok(AuthHeader::Bearer(token))
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    interval: u64,
}

async fn request_device_code(client: &Client, config: &BridgeConfig) -> Result<DeviceCodeResponse> {
    let url = format!("{}/api/sync/device/code", config.server_url);
    let response = client
        .post(url)
        .json(&serde_json::json!({ "machineLabel": config.machine_label }))
        .send()
        .await?
        .error_for_status()?;
    Ok(response.json::<DeviceCodeResponse>().await?)
}

async fn poll_device_token(
    client: &Client,
    config: &BridgeConfig,
    device: &DeviceCodeResponse,
) -> Result<String> {
    let url = format!("{}/api/sync/oauth/token", config.server_url);
    loop {
        let response = client
            .post(&url)
            .json(&serde_json::json!({ "deviceCode": device.device_code }))
            .send()
            .await?;

        if response.status().is_success() {
            let payload = response.json::<serde_json::Value>().await?;
            if let Some(token) = payload.get("accessToken").and_then(|v| v.as_str()) {
                return Ok(token.to_string());
            }
        }

        sleep(Duration::from_secs(device.interval)).await;
    }
}

async fn send_event(
    client: &Client,
    state: &Arc<Mutex<BridgeState>>,
    auth_header: &AuthHeader,
    event: QueuedEvent,
) -> Result<()> {
    let (machine_id, machine_label, server_url) = {
        let locked = state.lock().await;
        (
            locked.config.machine_id.clone(),
            locked.config.machine_label.clone(),
            locked.config.server_url.clone(),
        )
    };

    let payload = SyncEventsRequest {
        machine_id,
        machine_label,
        project_id: event.project_id,
        project_name: event.project_name,
        events: vec![event.event],
    };

    let mut request = client.post(format!("{}/api/sync/events", server_url));
    if let Some((name, value)) = auth_header.as_header() {
        request = request.header(name, value);
    }

    request.json(&payload).send().await?.error_for_status()?;
    Ok(())
}

async fn flush_queue(
    client: &Client,
    state: &Arc<Mutex<BridgeState>>,
    auth_header: &AuthHeader,
) -> Result<()> {
    let queued = {
        let mut locked = state.lock().await;
        if locked.queue.is_empty() {
            return Ok(());
        }
        let items = locked.queue.clone();
        locked.queue.clear();
        locked.save_queue();
        items
    };

    for event in queued {
        if let Err(err) = send_event(client, state, auth_header, event.clone()).await {
            let mut locked = state.lock().await;
            locked.queue.push(event);
            locked.save_queue();
            return Err(err);
        }
    }

    Ok(())
}

fn config_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".lean-spec"))
        .unwrap_or_else(|| PathBuf::from(".lean-spec"))
}

fn config_path() -> PathBuf {
    config_dir().join("bridge.json")
}

fn load_config() -> Result<BridgeConfig> {
    let path = config_path();
    if path.exists() {
        let content = fs::read_to_string(path)?;
        let mut config = serde_json::from_str::<BridgeConfig>(&content)?;
        if config.machine_id.is_empty() {
            config.machine_id = Uuid::new_v4().to_string();
        }
        if config.machine_label.is_empty() {
            config.machine_label = default_label();
        }
        return Ok(config);
    }

    Ok(BridgeConfig {
        server_url: "http://localhost:3333".to_string(),
        api_key: None,
        access_token: None,
        machine_id: Uuid::new_v4().to_string(),
        machine_label: default_label(),
        projects: Vec::new(),
    })
}

fn save_config(config: &BridgeConfig) -> Result<()> {
    if let Some(parent) = config_path().parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(config)?;
    fs::write(config_path(), content)?;
    Ok(())
}

fn default_label() -> String {
    hostname::get()
        .ok()
        .and_then(|name| name.into_string().ok())
        .unwrap_or_else(|| "LeanSpec Machine".to_string())
}

fn build_project_config(path: &str, machine_id: &str) -> Result<ProjectConfig> {
    let root = PathBuf::from(path);
    if !root.exists() {
        return Err(anyhow!("Project path not found: {}", path));
    }
    let specs_dir =
        find_specs_dir(&root).ok_or_else(|| anyhow!("specs directory not found for {}", path))?;
    let name = root
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("LeanSpec Project")
        .to_string();

    let namespace = Uuid::parse_str(machine_id).unwrap_or_else(|_| Uuid::new_v4());
    let id = Uuid::new_v5(&namespace, root.to_string_lossy().as_bytes()).to_string();

    Ok(ProjectConfig {
        id,
        name,
        path: root.to_string_lossy().to_string(),
        specs_dir: specs_dir.to_string_lossy().to_string(),
    })
}

fn find_specs_dir(root: &Path) -> Option<PathBuf> {
    let candidates = ["specs", ".lean-spec/specs", "docs/specs", "doc/specs"];
    for candidate in candidates {
        let path = root.join(candidate);
        if path.exists() {
            return Some(path);
        }
    }
    let config_json = root.join(".lean-spec/config.json");
    if let Ok(content) = fs::read_to_string(config_json) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(specs_dir) = json.get("specsDir").and_then(|v| v.as_str()) {
                let path = root.join(specs_dir);
                if path.exists() {
                    return Some(path);
                }
            }
        }
    }
    None
}
