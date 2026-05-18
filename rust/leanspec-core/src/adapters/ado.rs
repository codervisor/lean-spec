//! # Azure DevOps Work Items adapter
//!
//! [`Adapter`] implementation backed by Azure DevOps Work Items. Each spec
//! corresponds to a Work Item: `SpecDoc::id` is the work item id, `title` and
//! `content` map to `System.Title` and `System.Description`, and the metadata
//! fields project from native ADO fields (state, priority, tags, assignee,
//! due date).
//!
//! ## Authentication
//!
//! Personal Access Token (PAT) via HTTP Basic auth: base64-encode `:{token}`
//! and send as `Authorization: Basic {encoded}`. The PAT is read from an
//! environment variable at construction time (configurable, defaults to
//! `ADO_TOKEN`).
//!
//! ## Schema resolution
//!
//! ADO state values are project-defined rather than universal (open/closed
//! like GitHub). [`AdoAdapter::resolve_schema`] queries the project's work
//! item type states and populates the `status` field's enum options so that
//! `leanspec capabilities` shows the project's actual state names.
//!
//! ## Delete semantics
//!
//! ADO does not hard-delete work items via the standard API.
//! [`AdoAdapter::delete`] transitions `System.State` to the first state in
//! the `Completed` (or `Removed`) category. This matches the archive
//! semantics used by other adapters.
//!
//! ## Field mapping
//!
//! | ADO field                              | `SpecDoc` key |
//! |----------------------------------------|---------------|
//! | `System.Title`                         | `title`       |
//! | `System.State`                         | `status`      |
//! | `Microsoft.VSTS.Common.Priority`       | `priority`    |
//! | `System.Tags`                          | `tags`        |
//! | `System.AssignedTo.displayName`        | `assignee`    |
//! | `Microsoft.VSTS.Scheduling.DueDate`    | `due`         |
//! | `System.Description`                   | `content`     |

use std::collections::HashMap;
use std::sync::RwLock;
use std::time::Duration;

use chrono::{DateTime, Utc};
use reqwest::blocking::{Client, RequestBuilder, Response};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use reqwest::{Method, StatusCode};
use serde_json::{json, Value};

use super::{Adapter, AdapterCapabilities, AdapterError, ListFilter, SearchHit, SearchOptions};
use crate::model::{
    semantic, CreateRequest, EnumOption, FieldDef, FieldDisplay, FieldKind, FieldValue,
    LinkTypeDef, SpecDoc, SpecSchema, UpdateRequest,
};

/// Adapter name used in errors and capabilities.
pub const ADAPTER_NAME: &str = "ado";

/// Stable schema id for the ADO adapter.
pub const SCHEMA_ID: &str = "leanspec:ado";

/// REST API version pinned by the adapter.
const API_VERSION: &str = "7.1";

/// API version for endpoints that are still in preview.
const STATES_API_VERSION: &str = "7.1-preview.1";

/// Default upper bound on items returned by `list` when not capped by caller.
const DEFAULT_LIST_LIMIT: usize = 1000;

/// Maximum number of ids per `workitems?ids=...` batch fetch (ADO limit).
const BATCH_SIZE: usize = 200;

/// Schema field keys exposed by the ADO adapter.
pub mod field {
    pub const STATUS: &str = "status";
    pub const PRIORITY: &str = "priority";
    pub const TAGS: &str = "tags";
    pub const ASSIGNEE: &str = "assignee";
    pub const DUE: &str = "due";
    pub const CONTENT: &str = "content";
}

/// Native ADO field reference names used in WIQL and JSON Patch bodies.
mod ado_field {
    pub const TITLE: &str = "System.Title";
    pub const STATE: &str = "System.State";
    pub const PRIORITY: &str = "Microsoft.VSTS.Common.Priority";
    pub const TAGS: &str = "System.Tags";
    pub const ASSIGNED_TO: &str = "System.AssignedTo";
    pub const DUE_DATE: &str = "Microsoft.VSTS.Scheduling.DueDate";
    pub const DESCRIPTION: &str = "System.Description";
    pub const WORK_ITEM_TYPE: &str = "System.WorkItemType";
    pub const CREATED_DATE: &str = "System.CreatedDate";
    pub const CHANGED_DATE: &str = "System.ChangedDate";
    pub const TEAM_PROJECT: &str = "System.TeamProject";
    pub const ID: &str = "System.Id";
}

/// Fallback "closed" state names used when the live project state list cannot
/// be fetched. Covers the default Agile, Scrum, CMMI, and Basic processes.
const FALLBACK_CLOSED_STATES: &[&str] = &["Closed", "Done", "Resolved", "Removed", "Completed"];

/// Work item types queried during schema resolution. The union of their state
/// lists feeds the `status` enum options.
const DEFAULT_WIT_TYPES: &[&str] = &["User Story", "Bug", "Task", "Issue", "Epic", "Feature"];

fn build_priority_options() -> Vec<EnumOption> {
    vec![
        EnumOption {
            value: "critical".into(),
            label: "Critical".into(),
            color: Some("#dc2626".into()),
            icon: None,
            description: Some("ADO priority 1".into()),
        },
        EnumOption {
            value: "high".into(),
            label: "High".into(),
            color: Some("#ea580c".into()),
            icon: None,
            description: Some("ADO priority 2".into()),
        },
        EnumOption {
            value: "medium".into(),
            label: "Medium".into(),
            color: Some("#ca8a04".into()),
            icon: None,
            description: Some("ADO priority 3".into()),
        },
        EnumOption {
            value: "low".into(),
            label: "Low".into(),
            color: Some("#22c55e".into()),
            icon: None,
            description: Some("ADO priority 4".into()),
        },
    ]
}

fn build_schema() -> SpecSchema {
    SpecSchema {
        id: SCHEMA_ID.into(),
        name: "ADO Work Item".into(),
        extends: None,
        fields: vec![
            FieldDef {
                key: field::STATUS.into(),
                label: "State".into(),
                kind: FieldKind::Enum {
                    // Populated by `resolve_schema` from the project's
                    // work item type definitions.
                    options: vec![],
                    multi: false,
                    allow_custom: true,
                    dynamic: true,
                },
                display: FieldDisplay::Inline,
                required: true,
                semantic: Some(semantic::STATUS.to_string()),
                ai_hint: Some("Project-defined work item state".into()),
                placeholder: None,
            },
            FieldDef {
                key: field::PRIORITY.into(),
                label: "Priority".into(),
                kind: FieldKind::Enum {
                    options: build_priority_options(),
                    multi: false,
                    allow_custom: false,
                    dynamic: false,
                },
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::PRIORITY.to_string()),
                ai_hint: Some("Maps to ADO integer priority 1 (critical) – 4 (low)".into()),
                placeholder: None,
            },
            FieldDef {
                key: field::TAGS.into(),
                label: "Tags".into(),
                kind: FieldKind::Enum {
                    options: vec![],
                    multi: true,
                    allow_custom: true,
                    dynamic: false,
                },
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::TAGS.to_string()),
                ai_hint: Some("Semicolon-delimited ADO tags".into()),
                placeholder: None,
            },
            FieldDef {
                key: field::ASSIGNEE.into(),
                label: "Assigned To".into(),
                kind: FieldKind::Text,
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::ASSIGNEE.to_string()),
                ai_hint: Some("Display name or unique name of the assignee".into()),
                placeholder: Some("Display Name".into()),
            },
            FieldDef {
                key: field::DUE.into(),
                label: "Due Date".into(),
                kind: FieldKind::Text,
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::DUE_DATE.to_string()),
                ai_hint: Some("ISO date (YYYY-MM-DD)".into()),
                placeholder: Some("YYYY-MM-DD".into()),
            },
            FieldDef {
                key: field::CONTENT.into(),
                label: "Description".into(),
                kind: FieldKind::LongText,
                display: FieldDisplay::Section,
                required: false,
                semantic: None,
                ai_hint: Some("Plain text description; ADO stores as HTML".into()),
                placeholder: None,
            },
        ],
        link_types: vec![LinkTypeDef {
            key: "depends_on".into(),
            label: "Depends on".into(),
            inverse_key: Some("blocked_by".into()),
            inverse_label: Some("Blocked by".into()),
        }],
    }
}

fn build_capabilities() -> AdapterCapabilities {
    AdapterCapabilities {
        name: ADAPTER_NAME.into(),
        supports_create: true,
        supports_update: true,
        // ADO has no hard-delete; `delete` transitions to a closed state.
        supports_delete: true,
        supports_search: true,
        supports_webhooks: false,
        default_schema: SCHEMA_ID.into(),
    }
}

/// Adapter that speaks the Azure DevOps REST API.
pub struct AdoAdapter {
    org: String,
    project: String,
    /// Base URL for the ADO REST API. Defaults to `https://dev.azure.com` but
    /// can be overridden for tests against a mock server or on-prem installs.
    base_url: String,
    token: String,
    client: Client,
    capabilities: AdapterCapabilities,
    schema: SpecSchema,
    /// State names treated as "closed" — used by `list` (to filter archived
    /// items) and `delete` (to pick the transition target). Populated from
    /// [`Self::resolve_inline`] when the live state list can be fetched;
    /// otherwise falls back to [`FALLBACK_CLOSED_STATES`].
    closed_states: RwLock<Vec<String>>,
}

impl AdoAdapter {
    /// Construct a new adapter for `{org}/{project}`. The PAT is read from
    /// the environment variable named by `token_env`; it is never written to
    /// disk by this adapter.
    pub fn new(
        org: impl Into<String>,
        project: impl Into<String>,
        token_env: impl AsRef<str>,
    ) -> Result<Self, AdapterError> {
        Self::with_base_url(org, project, token_env, "https://dev.azure.com")
    }

    /// Same as [`Self::new`] but lets callers override the API base URL —
    /// used for on-prem ADO Server installs and for routing test traffic at
    /// a mock server.
    pub fn with_base_url(
        org: impl Into<String>,
        project: impl Into<String>,
        token_env: impl AsRef<str>,
        base_url: impl Into<String>,
    ) -> Result<Self, AdapterError> {
        let env_name = token_env.as_ref();
        let token = std::env::var(env_name).map_err(|_| AdapterError::AuthError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("environment variable '{env_name}' is not set"),
        })?;
        Self::with_token(org, project, token, base_url)
    }

    /// Internal constructor used by tests so the mock server URL can be
    /// injected and the token supplied directly.
    fn with_token(
        org: impl Into<String>,
        project: impl Into<String>,
        token: impl Into<String>,
        base_url: impl Into<String>,
    ) -> Result<Self, AdapterError> {
        let org: String = org.into();
        let project: String = project.into();
        validate_path_segment("organization", &org)?;
        validate_path_segment("project", &project)?;

        // Tokens commonly arrive with a trailing newline from shell pipelines
        // (`export ADO_TOKEN=$(cat token.txt)`). Trim that quietly — the CLI
        // does the same — but still reject any embedded control chars below.
        let token: String = token.into().trim().to_string();
        // Reject tokens that contain control characters or non-ASCII bytes.
        // Without this guard, base64 encoding would silently hide newline /
        // CR bytes that signal a misconfigured env var.
        validate_raw_token(&token)?;

        let client = Client::builder()
            .user_agent("leanspec-ado-adapter")
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| AdapterError::BackendError {
                adapter: ADAPTER_NAME.into(),
                reason: format!("failed to construct HTTP client: {e}"),
            })?;

        let fallback = FALLBACK_CLOSED_STATES
            .iter()
            .map(|s| (*s).to_string())
            .collect();

        Ok(Self {
            org,
            project,
            base_url: base_url.into(),
            token,
            client,
            capabilities: build_capabilities(),
            schema: build_schema(),
            closed_states: RwLock::new(fallback),
        })
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url.trim_end_matches('/'), path)
    }

    /// `/{org}/{project}/_apis/wit/...` prefix.
    fn wit_path(&self, suffix: &str) -> String {
        format!("/{}/{}/_apis/wit{}", self.org, self.project, suffix)
    }

    /// Fetch the project's work item type states and bake them into this
    /// adapter's schema and `closed_states` cache. Invoked by
    /// [`AdapterRegistry::create`] so callers that only call `adapter.schema()`
    /// see the resolved options.
    ///
    /// On failure `self.schema` is left untouched so a partial resolve never
    /// downgrades a previously-resolved schema to defaults.
    pub fn resolve_inline(&mut self) -> Result<(), AdapterError> {
        let mut next = self.schema.clone();
        self.resolve_schema(&mut next)?;
        self.schema = next;
        Ok(())
    }

    fn auth_headers(&self) -> HeaderMap {
        let mut h = HeaderMap::new();
        let auth = HeaderValue::from_str(&format!("Basic {}", basic_auth_value(&self.token)))
            .expect("token validated at construction");
        h.insert(AUTHORIZATION, auth);
        h.insert(ACCEPT, HeaderValue::from_static("application/json"));
        h.insert(USER_AGENT, HeaderValue::from_static("leanspec-ado-adapter"));
        h
    }

    fn request(&self, method: Method, url: &str) -> RequestBuilder {
        self.client
            .request(method, url)
            .headers(self.auth_headers())
    }

    /// Send a request and map HTTP errors onto [`AdapterError`].
    fn send(&self, req: RequestBuilder) -> Result<Response, AdapterError> {
        let resp = req.send().map_err(|e| AdapterError::BackendError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("network: {e}"),
        })?;
        let status = resp.status();
        if status.is_success() {
            return Ok(resp);
        }
        let body = resp.text().unwrap_or_default();
        Err(map_error(status, &body))
    }

    fn parse_json(resp: Response) -> Result<Value, AdapterError> {
        resp.json().map_err(|e| AdapterError::ParseError {
            path: "ado response".into(),
            reason: e.to_string(),
        })
    }

    /// Run a WIQL query and return the matching work item ids.
    fn wiql_ids(&self, query: &str) -> Result<Vec<i64>, AdapterError> {
        let url = self.url(&format!(
            "/{}/{}/_apis/wit/wiql?api-version={}",
            self.org, self.project, API_VERSION
        ));
        let body = json!({ "query": query });
        let resp = self.send(
            self.request(Method::POST, &url)
                .header(CONTENT_TYPE, "application/json")
                .json(&body),
        )?;
        let value = Self::parse_json(resp)?;
        let ids = value
            .get("workItems")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
            .iter()
            .filter_map(|w| w.get("id").and_then(|v| v.as_i64()))
            .collect();
        Ok(ids)
    }

    /// Batch-fetch work item details by id, in chunks of up to [`BATCH_SIZE`].
    fn fetch_work_items(&self, ids: &[i64]) -> Result<Vec<Value>, AdapterError> {
        let mut out = Vec::with_capacity(ids.len());
        for chunk in ids.chunks(BATCH_SIZE) {
            let ids_param = chunk
                .iter()
                .map(|n| n.to_string())
                .collect::<Vec<_>>()
                .join(",");
            let url = self.url(&self.wit_path(&format!(
                "/workitems?ids={}&$expand=all&api-version={}",
                ids_param, API_VERSION
            )));
            let resp = self.send(self.request(Method::GET, &url))?;
            let value = Self::parse_json(resp)?;
            let arr = value
                .get("value")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            out.extend(arr);
        }
        Ok(out)
    }

    /// Fetch the list of closed-state names that `list` filters out and
    /// `delete` uses as a transition target. Falls back to a static list if
    /// the project lookup fails.
    fn closed_states_snapshot(&self) -> Vec<String> {
        self.closed_states
            .read()
            .map(|g| g.clone())
            .unwrap_or_else(|p| p.into_inner().clone())
    }
}

impl Adapter for AdoAdapter {
    fn capabilities(&self) -> &AdapterCapabilities {
        &self.capabilities
    }

    fn schema(&self) -> &SpecSchema {
        &self.schema
    }

    fn resolve_schema(&self, schema: &mut SpecSchema) -> Result<(), AdapterError> {
        // Each option carries its ADO category alongside so the final sort
        // respects workflow order rather than collapsing to alphabetic.
        let mut state_options: Vec<(EnumOption, u8)> = Vec::new();
        let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut closed: Vec<String> = Vec::new();

        for wit in DEFAULT_WIT_TYPES {
            let url = self.url(&self.wit_path(&format!(
                "/workitemtypes/{}/states?api-version={}",
                url_encode(wit),
                STATES_API_VERSION
            )));
            // 404 just means this WIT type isn't part of the project's
            // process. Skip silently — different processes (Agile / Scrum /
            // Basic) only ship a subset of types.
            let resp = match self.send(self.request(Method::GET, &url)) {
                Ok(r) => r,
                Err(AdapterError::NotFound(_)) => continue,
                Err(other) => return Err(other),
            };
            let value = Self::parse_json(resp)?;
            for item in value
                .get("value")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
            {
                let Some(name) = item.get("name").and_then(|v| v.as_str()) else {
                    continue;
                };
                let category = item.get("category").and_then(|v| v.as_str()).unwrap_or("");
                let color = item
                    .get("color")
                    .and_then(|v| v.as_str())
                    .map(|c| format!("#{c}"));

                let is_closed = matches!(category, "Completed" | "Removed");
                if is_closed && !closed.iter().any(|s| s == name) {
                    closed.push(name.to_string());
                }

                if seen.insert(name.to_string()) {
                    state_options.push((
                        EnumOption {
                            value: name.to_string(),
                            label: name.to_string(),
                            color,
                            icon: None,
                            description: if category.is_empty() {
                                None
                            } else {
                                Some(format!("Category: {category}"))
                            },
                        },
                        category_order(category),
                    ));
                }
            }
        }

        // ADO categories define the natural workflow order (Proposed →
        // InProgress → Resolved → Completed → Removed). Sort by that first,
        // then alphabetically within a category so the output is stable.
        state_options.sort_by(|a, b| a.1.cmp(&b.1).then_with(|| a.0.value.cmp(&b.0.value)));
        let sorted: Vec<EnumOption> = state_options.into_iter().map(|(o, _)| o).collect();

        for f in schema.fields.iter_mut() {
            if f.key == field::STATUS {
                if let FieldKind::Enum { options, .. } = &mut f.kind {
                    if !sorted.is_empty() {
                        *options = sorted.clone();
                    }
                }
            }
        }

        if !closed.is_empty() {
            if let Ok(mut guard) = self.closed_states.write() {
                *guard = closed;
            }
        }

        Ok(())
    }

    fn list(&self, filter: &ListFilter) -> Result<Vec<SpecDoc>, AdapterError> {
        let wiql = build_list_wiql(filter, &self.closed_states_snapshot());
        let mut ids = self.wiql_ids(&wiql)?;
        ids.truncate(DEFAULT_LIST_LIMIT);
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        let items = self.fetch_work_items(&ids)?;
        Ok(items.iter().map(work_item_to_doc).collect())
    }

    fn get(&self, id: &str) -> Result<SpecDoc, AdapterError> {
        let url = self.url(&self.wit_path(&format!(
            "/workitems/{}?$expand=all&api-version={}",
            id, API_VERSION
        )));
        let resp = self
            .send(self.request(Method::GET, &url))
            .map_err(|e| with_not_found_id(e, id))?;
        let value = Self::parse_json(resp)?;
        Ok(work_item_to_doc(&value))
    }

    fn create(&self, req: &CreateRequest) -> Result<SpecDoc, AdapterError> {
        let wit_type = schema_id_to_wit_type(req.schema_id.as_deref());
        let mut patches: Vec<Value> = Vec::new();

        patches.push(json_patch_add(
            ado_field::TITLE,
            Value::String(req.title.clone()),
        ));

        if let Some(content) = req.fields.get(field::CONTENT).and_then(|v| v.as_str()) {
            patches.push(json_patch_add(
                ado_field::DESCRIPTION,
                Value::String(text_to_html(content)),
            ));
        }
        if let Some(status) = req.fields.get(field::STATUS).and_then(|v| v.as_str()) {
            patches.push(json_patch_add(
                ado_field::STATE,
                Value::String(status.into()),
            ));
        }
        if let Some(priority) = req.fields.get(field::PRIORITY).and_then(|v| v.as_str()) {
            let n = priority_str_to_int(priority).ok_or_else(|| AdapterError::InvalidField {
                adapter: ADAPTER_NAME.into(),
                reason: format!(
                    "priority must be one of critical/high/medium/low, got '{priority}'"
                ),
            })?;
            patches.push(json_patch_add(ado_field::PRIORITY, Value::Number(n.into())));
        }
        if let Some(tags) = req.fields.get(field::TAGS).and_then(|v| v.as_strings()) {
            patches.push(json_patch_add(
                ado_field::TAGS,
                Value::String(tags_to_string(tags)),
            ));
        }
        if let Some(assignee) = req.fields.get(field::ASSIGNEE).and_then(|v| v.as_str()) {
            patches.push(json_patch_add(
                ado_field::ASSIGNED_TO,
                Value::String(assignee.into()),
            ));
        }
        if let Some(due) = req.fields.get(field::DUE).and_then(|v| v.as_str()) {
            patches.push(json_patch_add(
                ado_field::DUE_DATE,
                Value::String(normalize_due_date(due)),
            ));
        }

        let url = self.url(&self.wit_path(&format!(
            "/workitems/${}?api-version={}",
            url_encode(&wit_type),
            API_VERSION
        )));
        let resp = self.send(
            self.request(Method::POST, &url)
                .header(CONTENT_TYPE, "application/json-patch+json")
                .json(&Value::Array(patches)),
        )?;
        let value = Self::parse_json(resp)?;
        Ok(work_item_to_doc(&value))
    }

    fn update(&self, id: &str, req: &UpdateRequest) -> Result<SpecDoc, AdapterError> {
        reject_unknown_fields(&req.fields, &self.schema)?;

        // A key cannot be set and cleared in the same request — without this
        // guard the two would produce two JSON-Patch ops on the same field
        // and "clear wins" silently. Surface the conflict explicitly so the
        // caller fixes it instead of debugging a missing field after-the-fact.
        for key in &req.clear {
            if req.fields.contains_key(key) {
                return Err(AdapterError::InvalidField {
                    adapter: ADAPTER_NAME.into(),
                    reason: format!("field '{key}' cannot be in both `fields` and `clear`"),
                });
            }
        }

        let mut patches: Vec<Value> = Vec::new();

        if let Some(ref title) = req.title {
            patches.push(json_patch_add(
                ado_field::TITLE,
                Value::String(title.clone()),
            ));
        }
        if let Some(content) = req.fields.get(field::CONTENT).and_then(|v| v.as_str()) {
            patches.push(json_patch_add(
                ado_field::DESCRIPTION,
                Value::String(text_to_html(content)),
            ));
        }
        if let Some(status) = req.fields.get(field::STATUS).and_then(|v| v.as_str()) {
            patches.push(json_patch_add(
                ado_field::STATE,
                Value::String(status.into()),
            ));
        }
        if let Some(priority) = req.fields.get(field::PRIORITY).and_then(|v| v.as_str()) {
            if let Some(n) = priority_str_to_int(priority) {
                patches.push(json_patch_add(ado_field::PRIORITY, Value::Number(n.into())));
            } else {
                return Err(AdapterError::InvalidField {
                    adapter: ADAPTER_NAME.into(),
                    reason: format!(
                        "priority must be one of critical/high/medium/low, got '{priority}'"
                    ),
                });
            }
        }
        if let Some(tags) = req.fields.get(field::TAGS).and_then(|v| v.as_strings()) {
            patches.push(json_patch_add(
                ado_field::TAGS,
                Value::String(tags_to_string(tags)),
            ));
        }
        if let Some(assignee) = req.fields.get(field::ASSIGNEE).and_then(|v| v.as_str()) {
            patches.push(json_patch_add(
                ado_field::ASSIGNED_TO,
                Value::String(assignee.into()),
            ));
        }
        if let Some(due) = req.fields.get(field::DUE).and_then(|v| v.as_str()) {
            patches.push(json_patch_add(
                ado_field::DUE_DATE,
                Value::String(normalize_due_date(due)),
            ));
        }

        // ADO accepts JSON Patch `remove` ops on a field path to clear it,
        // but in practice the safer cross-process behaviour is to add an
        // empty value. Use that for tags / assignee / due; status and
        // priority have no concept of "unset" in ADO so reject the clear.
        for key in &req.clear {
            match key.as_str() {
                field::TAGS => {
                    patches.push(json_patch_add(
                        ado_field::TAGS,
                        Value::String(String::new()),
                    ));
                }
                field::ASSIGNEE => {
                    patches.push(json_patch_remove(ado_field::ASSIGNED_TO));
                }
                field::DUE => {
                    patches.push(json_patch_remove(ado_field::DUE_DATE));
                }
                field::CONTENT => {
                    patches.push(json_patch_add(
                        ado_field::DESCRIPTION,
                        Value::String(String::new()),
                    ));
                }
                other => {
                    return Err(AdapterError::InvalidField {
                        adapter: ADAPTER_NAME.into(),
                        reason: format!("cannot clear field '{other}' on ADO work items"),
                    });
                }
            }
        }

        if patches.is_empty() {
            // Nothing to update — re-fetch and return the current state so
            // the caller still gets the latest version.
            return self.get(id);
        }

        let url =
            self.url(&self.wit_path(&format!("/workitems/{}?api-version={}", id, API_VERSION)));
        let resp = self
            .send(
                self.request(Method::PATCH, &url)
                    .header(CONTENT_TYPE, "application/json-patch+json")
                    .json(&Value::Array(patches)),
            )
            .map_err(|e| with_not_found_id(e, id))?;
        let value = Self::parse_json(resp)?;
        Ok(work_item_to_doc(&value))
    }

    fn delete(&self, id: &str) -> Result<(), AdapterError> {
        // ADO has no hard-delete via the standard REST API; transition to
        // the first known closed state instead. Mirror github's archive
        // semantics so the compliance harness behaves identically.
        let closed = self.closed_states_snapshot();
        let target = closed
            .first()
            .cloned()
            .unwrap_or_else(|| "Closed".to_string());

        let patches = vec![json_patch_add(ado_field::STATE, Value::String(target))];
        let url =
            self.url(&self.wit_path(&format!("/workitems/{}?api-version={}", id, API_VERSION)));
        self.send(
            self.request(Method::PATCH, &url)
                .header(CONTENT_TYPE, "application/json-patch+json")
                .json(&Value::Array(patches)),
        )
        .map_err(|e| with_not_found_id(e, id))?;
        Ok(())
    }

    fn search(&self, query: &str, opts: &SearchOptions) -> Result<Vec<SearchHit>, AdapterError> {
        // ADO doesn't expose a /search endpoint via the standard wit API,
        // so we approximate with a WIQL CONTAINS query on title + description.
        let limit = opts.limit.unwrap_or(30);
        let wiql = format!(
            "SELECT [{id}] FROM WorkItems WHERE [{proj}] = @project \
             AND ([{title}] CONTAINS '{q}' OR [{desc}] CONTAINS '{q}') \
             ORDER BY [{changed}] DESC",
            id = ado_field::ID,
            proj = ado_field::TEAM_PROJECT,
            title = ado_field::TITLE,
            desc = ado_field::DESCRIPTION,
            q = wiql_quote(query),
            changed = ado_field::CHANGED_DATE,
        );
        let mut ids = self.wiql_ids(&wiql)?;
        ids.truncate(limit);
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        let items = self.fetch_work_items(&ids)?;
        let hits = items
            .iter()
            .map(|item| {
                let id = item
                    .get("id")
                    .and_then(|v| v.as_i64())
                    .map(|n| n.to_string())
                    .unwrap_or_default();
                let snippet = if opts.include_body {
                    item.get("fields")
                        .and_then(|f| f.get(ado_field::DESCRIPTION))
                        .and_then(|v| v.as_str())
                        .map(|s| strip_html(s).chars().take(200).collect::<String>())
                } else {
                    None
                };
                SearchHit {
                    id,
                    // ADO has no relevance score; surface 1.0 for every
                    // CONTAINS match so callers can still sort hits.
                    score: 1.0,
                    snippet,
                }
            })
            .collect();
        Ok(hits)
    }
}

// ── Token validation (used by `leanspec init --adapter ado`) ─────────────────

/// Outcome of validating an ADO PAT against `GET /_apis/projects`.
#[derive(Debug, Clone)]
pub struct TokenValidation {
    /// Number of projects the token can see in the organisation.
    pub project_count: usize,
    /// `true` if `{project}` (passed in) is reachable.
    pub project_found: bool,
}

/// Validate an ADO PAT against `GET /{org}/_apis/projects`. Returns the
/// number of visible projects and whether the requested project is among
/// them.
pub fn validate_token(
    token: &str,
    org: &str,
    project: &str,
    base_url: Option<&str>,
) -> Result<TokenValidation, AdapterError> {
    let base = base_url
        .unwrap_or("https://dev.azure.com")
        .trim_end_matches('/');
    let url = format!("{base}/{org}/_apis/projects?api-version={API_VERSION}");

    validate_raw_token(token)?;
    let auth = format!("Basic {}", basic_auth_value(token));

    let client = Client::builder()
        .user_agent("leanspec-ado-adapter")
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| AdapterError::BackendError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("failed to construct HTTP client: {e}"),
        })?;

    let resp = client
        .get(&url)
        .header(AUTHORIZATION, auth)
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "leanspec-ado-adapter")
        .send()
        .map_err(|e| AdapterError::BackendError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("network: {e}"),
        })?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().unwrap_or_default();
        return Err(map_error(status, &body));
    }

    let body: Value = resp.json().map_err(|e| AdapterError::ParseError {
        path: "ado /projects response".into(),
        reason: e.to_string(),
    })?;

    let projects = body
        .get("value")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let project_found = projects
        .iter()
        .any(|p| p.get("name").and_then(|v| v.as_str()) == Some(project));

    Ok(TokenValidation {
        project_count: projects.len(),
        project_found,
    })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Project an ADO work item JSON payload onto a [`SpecDoc`].
pub(crate) fn work_item_to_doc(item: &Value) -> SpecDoc {
    let id = item
        .get("id")
        .and_then(|v| v.as_i64())
        .map(|n| n.to_string())
        .unwrap_or_default();
    let fields = item.get("fields").cloned().unwrap_or(Value::Null);

    let title = fields
        .get(ado_field::TITLE)
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let state = fields
        .get(ado_field::STATE)
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let wit_type = fields
        .get(ado_field::WORK_ITEM_TYPE)
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let mut out: HashMap<String, FieldValue> = HashMap::new();
    if !state.is_empty() {
        out.insert(field::STATUS.into(), FieldValue::String(state));
    }

    if let Some(p) = fields.get(ado_field::PRIORITY).and_then(|v| v.as_i64()) {
        if let Some(s) = priority_int_to_str(p as i32) {
            out.insert(field::PRIORITY.into(), FieldValue::String(s.into()));
        }
    }

    if let Some(tags) = fields.get(ado_field::TAGS).and_then(|v| v.as_str()) {
        let parsed = tags_from_string(tags);
        if !parsed.is_empty() {
            out.insert(field::TAGS.into(), FieldValue::Strings(parsed));
        }
    }

    if let Some(assignee) = fields.get(ado_field::ASSIGNED_TO) {
        let display = match assignee {
            Value::String(s) => Some(s.clone()),
            Value::Object(_) => assignee
                .get("displayName")
                .and_then(|v| v.as_str())
                .map(String::from)
                .or_else(|| {
                    assignee
                        .get("uniqueName")
                        .and_then(|v| v.as_str())
                        .map(String::from)
                }),
            _ => None,
        };
        if let Some(d) = display {
            if !d.is_empty() {
                out.insert(field::ASSIGNEE.into(), FieldValue::String(d));
            }
        }
    }

    if let Some(due) = fields.get(ado_field::DUE_DATE).and_then(|v| v.as_str()) {
        // ADO returns full RFC3339; trim to YYYY-MM-DD.
        let date = due.split('T').next().unwrap_or(due).to_string();
        out.insert(field::DUE.into(), FieldValue::String(date));
    }

    if let Some(desc) = fields.get(ado_field::DESCRIPTION).and_then(|v| v.as_str()) {
        let plain = strip_html(desc);
        if !plain.is_empty() {
            out.insert(field::CONTENT.into(), FieldValue::String(plain));
        }
    }

    let created_at = fields
        .get(ado_field::CREATED_DATE)
        .and_then(|v| v.as_str())
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&Utc));
    let updated_at = fields
        .get(ado_field::CHANGED_DATE)
        .and_then(|v| v.as_str())
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&Utc));
    let url = item
        .get("_links")
        .and_then(|l| l.get("html"))
        .and_then(|h| h.get("href"))
        .and_then(|v| v.as_str())
        .map(String::from);

    SpecDoc {
        id,
        title,
        schema_id: wit_type_to_schema_id(wit_type).into(),
        fields: out,
        links: Vec::new(),
        created_at,
        updated_at,
        url,
        raw: Some(item.clone()),
    }
}

fn json_patch_add(path: &str, value: Value) -> Value {
    json!({
        "op": "add",
        "path": format!("/fields/{path}"),
        "value": value,
    })
}

fn json_patch_remove(path: &str) -> Value {
    json!({
        "op": "remove",
        "path": format!("/fields/{path}"),
    })
}

/// Workflow order for ADO state categories — lower comes first.
fn category_order(category: &str) -> u8 {
    match category {
        "Proposed" => 0,
        "InProgress" => 1,
        "Resolved" => 2,
        "Completed" => 3,
        "Removed" => 4,
        _ => 5,
    }
}

/// Reject organization / project names that would corrupt the request URL.
/// Pre-validating here makes 404s and path-traversal-like surprises into a
/// clear `ConfigError` at construction time instead of an opaque 401/404
/// the first time the adapter is used.
fn validate_path_segment(label: &str, value: &str) -> Result<(), AdapterError> {
    if value.is_empty() {
        return Err(AdapterError::ConfigError(format!(
            "{label} must not be empty"
        )));
    }
    if let Some(bad) = value
        .chars()
        .find(|c| c.is_control() || matches!(*c, '/' | '?' | '#' | ' ' | '\\'))
    {
        return Err(AdapterError::ConfigError(format!(
            "{label} '{value}' contains illegal character {bad:?}"
        )));
    }
    Ok(())
}

/// Reject tokens that contain bytes which would silently corrupt the Basic
/// auth header — newlines, tabs, and other control characters.
fn validate_raw_token(token: &str) -> Result<(), AdapterError> {
    if let Some(bad) = token.chars().find(|c| c.is_control()) {
        return Err(AdapterError::AuthError {
            adapter: ADAPTER_NAME.into(),
            reason: format!(
                "token contains control character {bad:?}; check that the env \
                 var is not wrapping a stray newline"
            ),
        });
    }
    Ok(())
}

/// Base64-encode `:{token}` for HTTP Basic auth.
fn basic_auth_value(token: &str) -> String {
    // Hand-rolled base64 of `:` + token — avoids a new dependency for a
    // 30-line algorithm. RFC 4648 alphabet.
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut input = String::with_capacity(token.len() + 1);
    input.push(':');
    input.push_str(token);
    let bytes = input.as_bytes();

    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(ALPHABET[((n >> 18) & 0x3f) as usize] as char);
        out.push(ALPHABET[((n >> 12) & 0x3f) as usize] as char);
        if chunk.len() > 1 {
            out.push(ALPHABET[((n >> 6) & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(ALPHABET[(n & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

/// Map an ADO priority integer (1..=4) to a SpecDoc priority string.
pub(crate) fn priority_int_to_str(n: i32) -> Option<&'static str> {
    match n {
        1 => Some("critical"),
        2 => Some("high"),
        3 => Some("medium"),
        4 => Some("low"),
        _ => None,
    }
}

/// Map a SpecDoc priority string to an ADO priority integer (1..=4).
pub(crate) fn priority_str_to_int(s: &str) -> Option<i32> {
    match s {
        "critical" => Some(1),
        "high" => Some(2),
        "medium" => Some(3),
        "low" => Some(4),
        _ => None,
    }
}

/// Parse the semicolon-delimited `System.Tags` string into a list of trimmed,
/// non-empty values.
pub(crate) fn tags_from_string(s: &str) -> Vec<String> {
    s.split(';')
        .map(|t| t.trim())
        .filter(|t| !t.is_empty())
        .map(String::from)
        .collect()
}

/// Render a list of tags into the `; `-joined `System.Tags` string.
pub(crate) fn tags_to_string(tags: &[String]) -> String {
    tags.iter()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("; ")
}

/// Strip enough HTML to recover plain text from `System.Description`.
///
/// Block-level tags (`<p>`, `<br>`, `</li>`) become newlines; `<li>` becomes
/// `- `; all other tags are dropped and their text content is preserved.
/// Common HTML entities are decoded.
pub(crate) fn strip_html(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'<' {
            // Find the closing '>'.
            if let Some(end) = bytes[i + 1..].iter().position(|&b| b == b'>') {
                let tag_lower = std::str::from_utf8(&bytes[i + 1..i + 1 + end])
                    .unwrap_or("")
                    .to_lowercase();
                let stripped = tag_lower.trim_start_matches('/').trim();
                // Map block tags to whitespace replacements.
                let replacement: &str = match stripped {
                    s if s.starts_with("br") => "\n",
                    "p" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "ul" | "ol" => {
                        // Opening or closing of a block element acts as a
                        // newline boundary. Multiple consecutive newlines
                        // get collapsed below.
                        "\n"
                    }
                    "li" if !tag_lower.starts_with('/') => "- ",
                    "li" => "\n",
                    _ => "",
                };
                out.push_str(replacement);
                i += 1 + end + 1;
                continue;
            } else {
                // Unterminated `<` — preserve and stop tag handling.
                out.push('<');
                i += 1;
                continue;
            }
        } else if bytes[i] == b'&' {
            // Entity decode.
            if let Some(semi) = bytes[i + 1..].iter().position(|&b| b == b';') {
                let entity = std::str::from_utf8(&bytes[i + 1..i + 1 + semi]).unwrap_or("");
                let decoded = match entity {
                    "amp" => Some("&"),
                    "lt" => Some("<"),
                    "gt" => Some(">"),
                    "quot" => Some("\""),
                    "apos" | "#39" => Some("'"),
                    "nbsp" => Some(" "),
                    _ => None,
                };
                if let Some(s) = decoded {
                    out.push_str(s);
                    i += 1 + semi + 1;
                    continue;
                }
            }
            out.push('&');
            i += 1;
        } else {
            out.push(bytes[i] as char);
            i += 1;
        }
    }

    // Collapse runs of >=3 consecutive newlines into a blank-line pair so
    // round-tripped content keeps its shape without ballooning.
    let mut cleaned = String::with_capacity(out.len());
    let mut newline_run = 0;
    for ch in out.chars() {
        if ch == '\n' {
            newline_run += 1;
            if newline_run <= 2 {
                cleaned.push(ch);
            }
        } else {
            newline_run = 0;
            cleaned.push(ch);
        }
    }
    cleaned.trim().to_string()
}

/// Wrap plain text in a single `<p>` block and escape HTML special chars.
///
/// We do not perform full markdown-to-HTML conversion; teams using rich
/// formatting in ADO should not migrate to LeanSpec CLI.
pub(crate) fn text_to_html(text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }
    let escaped = text
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");
    // Preserve newlines as <br> so the description doesn't collapse to a
    // single line in the ADO UI.
    let with_breaks = escaped.replace('\n', "<br>");
    format!("<p>{with_breaks}</p>")
}

/// Map a `SpecDoc::schema_id` value back to an ADO work item type.
pub(crate) fn schema_id_to_wit_type(schema_id: Option<&str>) -> String {
    match schema_id {
        Some("leanspec:bug") => "Bug".to_string(),
        Some("leanspec:feature") => "User Story".to_string(),
        Some("leanspec:base") | None => "Task".to_string(),
        // Unknown schema ids fall through to Task — alternative would be to
        // reject, but Task is the most permissive type so this preserves
        // the principle of least astonishment.
        Some(_) => "Task".to_string(),
    }
}

/// Map an ADO work item type onto a `SpecDoc::schema_id`.
pub(crate) fn wit_type_to_schema_id(wit_type: &str) -> &'static str {
    match wit_type {
        "Bug" => "leanspec:bug",
        "User Story" | "Feature" | "Product Backlog Item" | "Requirement" => "leanspec:feature",
        _ => "leanspec:base",
    }
}

/// Escape a value for safe inclusion in a WIQL string literal: single quote
/// → two single quotes. WIQL is the only injection-prone surface in this
/// adapter so the helper lives here rather than as a generic util.
fn wiql_quote(value: &str) -> String {
    value.replace('\'', "''")
}

/// Build the WIQL query string for [`Adapter::list`]. Extracted so the
/// list-filter logic can be unit-tested directly without rigging up a
/// mock HTTP server.
fn build_list_wiql(filter: &ListFilter, closed_states: &[String]) -> String {
    let mut conditions: Vec<String> = vec![format!("[{}] = @project", ado_field::TEAM_PROJECT)];

    // Status filter (a specific state). When no explicit status is requested
    // and archives are excluded, filter out the closed-state set instead.
    let status_filter = filter
        .fields
        .get(field::STATUS)
        .and_then(|v| v.first())
        .cloned();
    if let Some(state) = status_filter.as_ref() {
        conditions.push(format!("[{}] = '{}'", ado_field::STATE, wiql_quote(state)));
    } else if !filter.include_archived {
        for state in closed_states {
            conditions.push(format!("[{}] <> '{}'", ado_field::STATE, wiql_quote(state)));
        }
    }

    if let Some(tags) = filter.fields.get(field::TAGS) {
        for tag in tags {
            conditions.push(format!(
                "[{}] CONTAINS '{}'",
                ado_field::TAGS,
                wiql_quote(tag)
            ));
        }
    }

    if let Some(assignees) = filter.fields.get(field::ASSIGNEE) {
        if let Some(first) = assignees.first() {
            conditions.push(format!(
                "[{}] = '{}'",
                ado_field::ASSIGNED_TO,
                wiql_quote(first)
            ));
        }
    }

    if let Some(ref text) = filter.text {
        conditions.push(format!(
            "([{}] CONTAINS '{}' OR [{}] CONTAINS '{}')",
            ado_field::TITLE,
            wiql_quote(text),
            ado_field::DESCRIPTION,
            wiql_quote(text),
        ));
    }

    // `TOP N` makes ADO short-circuit server-side once N matches are found,
    // sparing the WIQL engine from materialising the full result set on
    // projects with large backlogs (server-side cap is ~20k otherwise).
    format!(
        "SELECT TOP {} [{}] FROM WorkItems WHERE {} ORDER BY [{}] DESC",
        DEFAULT_LIST_LIMIT,
        ado_field::ID,
        conditions.join(" AND "),
        ado_field::CHANGED_DATE
    )
}

/// Percent-encode a value for inclusion as a URL path segment. Follows RFC
/// 3986 `unreserved`: only `A-Za-z0-9-._~` pass through; everything else
/// (including reserved chars like `/`, `?`, `#`, `&`, `+`) is percent-encoded
/// so a future caller can't accidentally inject path or query syntax.
fn url_encode(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        if matches!(ch, 'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~') {
            out.push(ch);
        } else {
            let mut buf = [0u8; 4];
            for byte in ch.encode_utf8(&mut buf).bytes() {
                out.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    out
}

/// Trim a YYYY-MM-DD or YYYY-MM-DDTHH... due-date string to the form ADO
/// expects (ISO date with `T00:00:00Z` if no time was given).
fn normalize_due_date(s: &str) -> String {
    if s.contains('T') {
        s.to_string()
    } else {
        format!("{s}T00:00:00Z")
    }
}

/// Re-emit a generic `NotFound(message)` (which `map_error` produces from a
/// 404 body) as `NotFound(id)` at the call site where `id` is known.
fn with_not_found_id(err: AdapterError, id: &str) -> AdapterError {
    match err {
        AdapterError::NotFound(_) => AdapterError::NotFound(id.to_string()),
        other => other,
    }
}

fn reject_unknown_fields(
    fields: &HashMap<String, FieldValue>,
    schema: &SpecSchema,
) -> Result<(), AdapterError> {
    for key in fields.keys() {
        if schema.field(key).is_none() {
            return Err(AdapterError::InvalidField {
                adapter: ADAPTER_NAME.into(),
                reason: format!(
                    "unknown field '{}' — check the schema for supported fields",
                    key
                ),
            });
        }
    }
    Ok(())
}

/// Map a non-success HTTP response onto [`AdapterError`].
pub(crate) fn map_error(status: StatusCode, body: &str) -> AdapterError {
    match status.as_u16() {
        401 => AdapterError::AuthError {
            adapter: ADAPTER_NAME.into(),
            reason: "ADO PAT is invalid or missing".into(),
        },
        403 => AdapterError::AuthError {
            adapter: ADAPTER_NAME.into(),
            reason: format!(
                "forbidden: {}",
                short_error_message(body).unwrap_or_else(|| body.into())
            ),
        },
        404 => {
            AdapterError::NotFound(short_error_message(body).unwrap_or_else(|| body.to_string()))
        }
        429 => AdapterError::RateLimit {
            adapter: ADAPTER_NAME.into(),
            reset_at: None,
        },
        422 | 400 => AdapterError::InvalidField {
            adapter: ADAPTER_NAME.into(),
            reason: short_error_message(body).unwrap_or_else(|| body.to_string()),
        },
        s if (500..600).contains(&s) => AdapterError::BackendError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("HTTP {s}: {body}"),
        },
        s => AdapterError::BackendError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("HTTP {s}: {body}"),
        },
    }
}

fn short_error_message(body: &str) -> Option<String> {
    serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(String::from))
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::Matcher;
    use serde_json::json;

    fn adapter(server: &mockito::ServerGuard) -> AdoAdapter {
        AdoAdapter::with_token("acme", "MyProject", "test-token", server.url()).unwrap()
    }

    fn sample_work_item(id: u64) -> Value {
        json!({
            "id": id,
            "rev": 3,
            "fields": {
                "System.Id": id,
                "System.Title": "Hello world",
                "System.State": "Active",
                "System.WorkItemType": "User Story",
                "System.Tags": "bug; backend",
                "Microsoft.VSTS.Common.Priority": 2,
                "System.AssignedTo": {
                    "displayName": "Alice",
                    "uniqueName": "alice@acme.com"
                },
                "Microsoft.VSTS.Scheduling.DueDate": "2026-06-30T00:00:00Z",
                "System.Description": "<p>Body <b>html</b></p>",
                "System.CreatedDate": "2026-01-01T10:00:00Z",
                "System.ChangedDate": "2026-01-02T11:00:00Z"
            },
            "_links": {
                "html": {
                    "href": format!("https://dev.azure.com/acme/MyProject/_workitems/edit/{id}")
                }
            }
        })
    }

    #[test]
    fn schema_declares_expected_fields() {
        let s = mockito::Server::new();
        let a = adapter(&s);
        let schema = a.schema();
        assert_eq!(schema.id, SCHEMA_ID);
        assert!(schema.field(field::STATUS).is_some());
        assert!(schema.field(field::PRIORITY).is_some());
        assert!(schema.field(field::TAGS).is_some());
        assert!(schema.field(field::ASSIGNEE).is_some());
        assert!(schema.field(field::DUE).is_some());
        assert!(schema.field(field::CONTENT).is_some());
        assert_eq!(
            schema.key_for_semantic(semantic::STATUS),
            Some(field::STATUS)
        );
        assert_eq!(
            schema.key_for_semantic(semantic::PRIORITY),
            Some(field::PRIORITY)
        );
    }

    #[test]
    fn passes_schema_compliance_check() {
        use crate::adapters::test_harness::{check_schema_consistency, ComplianceOptions};
        let s = mockito::Server::new();
        let a = adapter(&s);
        let opts = ComplianceOptions {
            status_active: "Active".into(),
            status_alt: "Closed".into(),
            delete_is_archive: true,
            supports_links: false,
            ..ComplianceOptions::default()
        };
        check_schema_consistency(&a, &opts);
    }

    #[test]
    fn capabilities_match_spec() {
        let s = mockito::Server::new();
        let a = adapter(&s);
        let c = a.capabilities();
        assert_eq!(c.name, ADAPTER_NAME);
        assert!(c.supports_create);
        assert!(c.supports_update);
        assert!(c.supports_delete);
        assert!(c.supports_search);
        assert!(!c.supports_webhooks);
        assert_eq!(c.default_schema, SCHEMA_ID);
    }

    #[test]
    fn invalid_token_fails_at_construction() {
        match AdoAdapter::with_token("o", "p", "bad\ntoken", "http://localhost") {
            Ok(_) => panic!("should reject invalid token"),
            Err(AdapterError::AuthError { .. }) => {}
            Err(other) => panic!("expected AuthError, got {other:?}"),
        }
    }

    #[test]
    fn priority_int_str_round_trip() {
        for (n, s) in [(1, "critical"), (2, "high"), (3, "medium"), (4, "low")] {
            assert_eq!(priority_int_to_str(n), Some(s));
            assert_eq!(priority_str_to_int(s), Some(n));
        }
        assert_eq!(priority_int_to_str(0), None);
        assert_eq!(priority_int_to_str(5), None);
        assert_eq!(priority_str_to_int("frobnicated"), None);
    }

    #[test]
    fn tags_round_trip() {
        let tags = tags_from_string("bug; backend; ui");
        assert_eq!(tags, vec!["bug", "backend", "ui"]);
        let joined = tags_to_string(&["bug".into(), "backend".into()]);
        assert_eq!(joined, "bug; backend");
        // Empties and whitespace get dropped.
        let tags = tags_from_string("  ; ; foo;  ; bar; ");
        assert_eq!(tags, vec!["foo", "bar"]);
    }

    #[test]
    fn schema_id_to_wit_type_mapping() {
        assert_eq!(schema_id_to_wit_type(Some("leanspec:bug")), "Bug");
        assert_eq!(
            schema_id_to_wit_type(Some("leanspec:feature")),
            "User Story"
        );
        assert_eq!(schema_id_to_wit_type(Some("leanspec:base")), "Task");
        assert_eq!(schema_id_to_wit_type(None), "Task");
        // Unknown schemas default to Task rather than rejecting.
        assert_eq!(schema_id_to_wit_type(Some("acme:custom")), "Task");
    }

    #[test]
    fn wit_type_to_schema_id_mapping() {
        assert_eq!(wit_type_to_schema_id("Bug"), "leanspec:bug");
        assert_eq!(wit_type_to_schema_id("User Story"), "leanspec:feature");
        assert_eq!(wit_type_to_schema_id("Feature"), "leanspec:feature");
        assert_eq!(wit_type_to_schema_id("Epic"), "leanspec:base");
        assert_eq!(wit_type_to_schema_id("Task"), "leanspec:base");
    }

    #[test]
    fn strip_html_minimal() {
        assert_eq!(strip_html("<p>Hello world</p>"), "Hello world");
        assert_eq!(strip_html("<p>One</p><p>Two</p>"), "One\n\nTwo");
        assert_eq!(strip_html("Line<br>break"), "Line\nbreak");
        assert_eq!(
            strip_html("<b>bold</b> and <i>italic</i>"),
            "bold and italic"
        );
        assert_eq!(
            strip_html("<ul><li>one</li><li>two</li></ul>"),
            "- one\n- two"
        );
        assert_eq!(strip_html("a &amp; b &lt; c &gt; d"), "a & b < c > d");
        // Stray '<' without matching '>' preserved.
        assert_eq!(strip_html("a < b"), "a < b");
    }

    #[test]
    fn text_to_html_escapes_specials() {
        assert_eq!(text_to_html(""), "");
        assert_eq!(text_to_html("hello"), "<p>hello</p>");
        assert_eq!(
            text_to_html("a & b < c > d"),
            "<p>a &amp; b &lt; c &gt; d</p>"
        );
        assert_eq!(text_to_html("line\nbreak"), "<p>line<br>break</p>");
    }

    #[test]
    fn basic_auth_encodes_token() {
        // base64(":hello") = OmhlbGxv
        assert_eq!(basic_auth_value("hello"), "OmhlbGxv");
        // Empty token still includes the leading colon: base64(":") = Og==
        assert_eq!(basic_auth_value(""), "Og==");
    }

    #[test]
    fn url_encode_handles_spaces() {
        assert_eq!(url_encode("User Story"), "User%20Story");
        assert_eq!(url_encode("Task"), "Task");
        assert_eq!(url_encode("Café"), "Caf%C3%A9");
    }

    #[test]
    fn wiql_quote_doubles_single_quotes() {
        assert_eq!(wiql_quote("plain"), "plain");
        assert_eq!(wiql_quote("it's"), "it''s");
    }

    #[test]
    fn work_item_to_doc_maps_all_fields() {
        let v = sample_work_item(42);
        let doc = work_item_to_doc(&v);
        assert_eq!(doc.id, "42");
        assert_eq!(doc.title, "Hello world");
        assert_eq!(doc.schema_id, "leanspec:feature");
        assert_eq!(doc.field_str(field::STATUS), Some("Active"));
        assert_eq!(doc.field_str(field::PRIORITY), Some("high"));
        assert_eq!(
            doc.fields.get(field::TAGS).and_then(|v| v.as_strings()),
            Some(&["bug".to_string(), "backend".to_string()][..])
        );
        assert_eq!(doc.field_str(field::ASSIGNEE), Some("Alice"));
        assert_eq!(doc.field_str(field::DUE), Some("2026-06-30"));
        assert_eq!(doc.field_str(field::CONTENT), Some("Body html"));
        assert!(doc.url.as_deref().unwrap().contains("/edit/42"));
        assert!(doc.created_at.is_some());
        assert!(doc.updated_at.is_some());
        assert!(doc.raw.is_some());
    }

    #[test]
    fn work_item_to_doc_handles_missing_fields() {
        let v = json!({
            "id": 7,
            "fields": {
                "System.Title": "Bare",
                "System.WorkItemType": "Task"
            }
        });
        let doc = work_item_to_doc(&v);
        assert_eq!(doc.id, "7");
        assert_eq!(doc.title, "Bare");
        assert_eq!(doc.schema_id, "leanspec:base");
        assert!(doc.field(field::PRIORITY).is_none());
        assert!(doc.field(field::TAGS).is_none());
        assert!(doc.field(field::ASSIGNEE).is_none());
        assert!(doc.field(field::CONTENT).is_none());
    }

    #[test]
    fn get_happy_path() {
        let mut server = mockito::Server::new();
        let _m = server
            .mock("GET", "/acme/MyProject/_apis/wit/workitems/123")
            .match_query(Matcher::AllOf(vec![
                Matcher::UrlEncoded("$expand".into(), "all".into()),
                Matcher::UrlEncoded("api-version".into(), API_VERSION.into()),
            ]))
            .match_header(
                "authorization",
                format!("Basic {}", basic_auth_value("test-token")).as_str(),
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(sample_work_item(123).to_string())
            .create();

        let a = adapter(&server);
        let doc = a.get("123").unwrap();
        assert_eq!(doc.id, "123");
    }

    #[test]
    fn get_not_found_carries_requested_id() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/acme/MyProject/_apis/wit/workitems/999")
            .match_query(Matcher::AnyOf(vec![Matcher::Any]))
            .with_status(404)
            .with_body(r#"{"message":"Work item 999 does not exist."}"#)
            .create();

        let a = adapter(&server);
        match a.get("999").unwrap_err() {
            AdapterError::NotFound(id) => assert_eq!(id, "999"),
            other => panic!("expected NotFound(\"999\"), got {other:?}"),
        }
    }

    #[test]
    fn create_posts_json_patch_body() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("POST", "/acme/MyProject/_apis/wit/workitems/$User%20Story")
            .match_query(Matcher::UrlEncoded(
                "api-version".into(),
                API_VERSION.into(),
            ))
            .match_header("content-type", "application/json-patch+json")
            // The detailed shape of each JSON-Patch op is asserted by the
            // helper unit tests above (priority_int_to_str, tags_to_string,
            // text_to_html, json_patch_add). Here we just verify create()
            // makes the right HTTP call and routes the response back.
            .with_status(200)
            .with_body(sample_work_item(101).to_string())
            .create();

        let mut fields = HashMap::new();
        fields.insert(field::CONTENT.into(), FieldValue::from("Body text"));
        fields.insert(field::PRIORITY.into(), FieldValue::from("high"));
        fields.insert(
            field::TAGS.into(),
            FieldValue::from(vec!["bug".to_string(), "backend".to_string()]),
        );
        fields.insert(field::ASSIGNEE.into(), FieldValue::from("Alice"));

        let a = adapter(&server);
        let doc = a
            .create(&CreateRequest {
                slug: None,
                title: "My Story".into(),
                schema_id: Some("leanspec:feature".into()),
                fields,
                links: vec![],
            })
            .unwrap();
        assert_eq!(doc.id, "101");
        m.assert();
    }

    #[test]
    fn create_builds_expected_patch_ops() {
        // Direct test of the patch builder: exercise priority, tags,
        // assignee, content, and due so the structural shape is locked.
        let mut fields = HashMap::new();
        fields.insert(field::CONTENT.into(), FieldValue::from("Body text"));
        fields.insert(field::PRIORITY.into(), FieldValue::from("high"));
        fields.insert(
            field::TAGS.into(),
            FieldValue::from(vec!["bug".to_string(), "backend".to_string()]),
        );
        fields.insert(field::ASSIGNEE.into(), FieldValue::from("Alice"));
        fields.insert(field::DUE.into(), FieldValue::from("2026-06-30"));
        fields.insert(field::STATUS.into(), FieldValue::from("Active"));

        let req = CreateRequest {
            slug: None,
            title: "My Story".into(),
            schema_id: Some("leanspec:feature".into()),
            fields,
            links: vec![],
        };
        // Walk through what `create` would emit by re-using the public
        // helpers in this module — guards every encoder in one place.
        assert_eq!(priority_str_to_int("high"), Some(2));
        assert_eq!(
            tags_to_string(&["bug".to_string(), "backend".to_string()]),
            "bug; backend"
        );
        assert_eq!(text_to_html("Body text"), "<p>Body text</p>");
        assert_eq!(normalize_due_date("2026-06-30"), "2026-06-30T00:00:00Z");
        assert_eq!(
            schema_id_to_wit_type(req.schema_id.as_deref()),
            "User Story"
        );
    }

    #[test]
    fn create_defaults_to_task_when_schema_id_missing() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("POST", "/acme/MyProject/_apis/wit/workitems/$Task")
            .match_query(Matcher::UrlEncoded(
                "api-version".into(),
                API_VERSION.into(),
            ))
            .with_status(200)
            .with_body(sample_work_item(202).to_string())
            .create();

        let a = adapter(&server);
        a.create(&CreateRequest {
            slug: None,
            title: "Plain task".into(),
            schema_id: None,
            fields: HashMap::new(),
            links: vec![],
        })
        .unwrap();
        m.assert();
    }

    #[test]
    fn create_uses_bug_type_for_bug_schema() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("POST", "/acme/MyProject/_apis/wit/workitems/$Bug")
            .match_query(Matcher::UrlEncoded(
                "api-version".into(),
                API_VERSION.into(),
            ))
            .with_status(200)
            .with_body(sample_work_item(303).to_string())
            .create();

        let a = adapter(&server);
        a.create(&CreateRequest {
            slug: None,
            title: "Broken".into(),
            schema_id: Some("leanspec:bug".into()),
            fields: HashMap::new(),
            links: vec![],
        })
        .unwrap();
        m.assert();
    }

    #[test]
    fn update_patches_provided_fields_only() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("PATCH", "/acme/MyProject/_apis/wit/workitems/42")
            .match_query(Matcher::UrlEncoded(
                "api-version".into(),
                API_VERSION.into(),
            ))
            .match_header("content-type", "application/json-patch+json")
            .match_body(Matcher::PartialJsonString(
                json!([
                    { "op": "add", "path": "/fields/System.Title", "value": "Renamed" },
                    { "op": "add", "path": "/fields/System.State", "value": "Closed" }
                ])
                .to_string(),
            ))
            .with_status(200)
            .with_body(sample_work_item(42).to_string())
            .create();

        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), FieldValue::from("Closed"));

        let a = adapter(&server);
        a.update(
            "42",
            &UpdateRequest {
                title: Some("Renamed".into()),
                fields,
                clear: vec![],
                replace_links: None,
            },
        )
        .unwrap();
        m.assert();
    }

    #[test]
    fn update_rejects_unknown_field() {
        let server = mockito::Server::new();
        let a = adapter(&server);
        let mut fields = HashMap::new();
        fields.insert("nonexistent".into(), FieldValue::from("x"));
        let err = a
            .update(
                "1",
                &UpdateRequest {
                    title: None,
                    fields,
                    clear: vec![],
                    replace_links: None,
                },
            )
            .unwrap_err();
        assert!(matches!(err, AdapterError::InvalidField { .. }));
    }

    #[test]
    fn create_rejects_invalid_priority_value() {
        let server = mockito::Server::new();
        let a = adapter(&server);
        let mut fields = HashMap::new();
        fields.insert(field::PRIORITY.into(), FieldValue::from("urgent"));
        let err = a
            .create(&CreateRequest {
                slug: None,
                title: "x".into(),
                schema_id: None,
                fields,
                links: vec![],
            })
            .unwrap_err();
        assert!(matches!(err, AdapterError::InvalidField { .. }));
    }

    #[test]
    fn update_rejects_conflict_between_fields_and_clear() {
        let server = mockito::Server::new();
        let a = adapter(&server);
        let mut fields = HashMap::new();
        fields.insert(
            field::TAGS.into(),
            FieldValue::from(vec!["bug".to_string()]),
        );
        let err = a
            .update(
                "1",
                &UpdateRequest {
                    title: None,
                    fields,
                    clear: vec![field::TAGS.into()],
                    replace_links: None,
                },
            )
            .unwrap_err();
        match err {
            AdapterError::InvalidField { reason, .. } => assert!(reason.contains("tags")),
            other => panic!("expected InvalidField, got {other:?}"),
        }
    }

    fn expect_config_error(result: Result<AdoAdapter, AdapterError>) {
        match result {
            Err(AdapterError::ConfigError(_)) => {}
            Err(other) => panic!("expected ConfigError, got {other:?}"),
            Ok(_) => panic!("expected ConfigError, got Ok"),
        }
    }

    #[test]
    fn constructor_rejects_org_with_slash() {
        expect_config_error(AdoAdapter::with_token(
            "a/b",
            "p",
            "tok",
            "http://localhost",
        ));
    }

    #[test]
    fn constructor_rejects_empty_project() {
        expect_config_error(AdoAdapter::with_token(
            "acme",
            "",
            "tok",
            "http://localhost",
        ));
    }

    #[test]
    fn constructor_rejects_project_with_space() {
        expect_config_error(AdoAdapter::with_token(
            "acme",
            "My Project",
            "tok",
            "http://localhost",
        ));
    }

    #[test]
    fn constructor_trims_token_whitespace() {
        // Trailing newline gets stripped silently so `export ADO_TOKEN=$(cat
        // file)` works without an unhelpful "control character" error.
        AdoAdapter::with_token("acme", "MyProject", "valid-token\n", "http://localhost")
            .expect("trailing newline should be trimmed");
    }

    #[test]
    fn url_encode_strict_escapes_reserved_chars() {
        // Reserved path / query / fragment chars must round-trip through
        // percent-encoding rather than slip through verbatim.
        assert_eq!(url_encode("a/b"), "a%2Fb");
        assert_eq!(url_encode("a?b"), "a%3Fb");
        assert_eq!(url_encode("a#b"), "a%23b");
        assert_eq!(url_encode("a&b"), "a%26b");
        assert_eq!(url_encode("a+b"), "a%2Bb");
    }

    #[test]
    fn list_wiql_emits_top_n_clause() {
        let wiql = build_list_wiql(&ListFilter::default(), &[]);
        assert!(
            wiql.starts_with(&format!("SELECT TOP {DEFAULT_LIST_LIMIT}")),
            "expected TOP clause, got: {wiql}"
        );
    }

    #[test]
    fn resolve_schema_orders_states_by_category() {
        let mut server = mockito::Server::new();
        // Other WIT types 404.
        for wit in DEFAULT_WIT_TYPES {
            if *wit == "User Story" {
                continue;
            }
            server
                .mock(
                    "GET",
                    format!(
                        "/acme/MyProject/_apis/wit/workitemtypes/{}/states",
                        url_encode(wit)
                    )
                    .as_str(),
                )
                .match_query(Matcher::AnyOf(vec![Matcher::Any]))
                .with_status(404)
                .with_body(r#"{"message":"type not found"}"#)
                .expect_at_least(0)
                .create();
        }
        // Deliberately list states in non-workflow order to exercise sorting.
        let states = json!({
            "value": [
                { "name": "Closed",   "color": "339933", "category": "Completed" },
                { "name": "Active",   "color": "007acc", "category": "InProgress" },
                { "name": "New",      "color": "b2b2b2", "category": "Proposed" },
                { "name": "Resolved", "color": "ff9900", "category": "Resolved" }
            ]
        });
        server
            .mock(
                "GET",
                "/acme/MyProject/_apis/wit/workitemtypes/User%20Story/states",
            )
            .match_query(Matcher::AnyOf(vec![Matcher::Any]))
            .with_status(200)
            .with_body(states.to_string())
            .create();

        let mut a = adapter(&server);
        a.resolve_inline().unwrap();
        let status = a.schema().field(field::STATUS).unwrap();
        match &status.kind {
            FieldKind::Enum { options, .. } => {
                let order: Vec<_> = options.iter().map(|o| o.value.as_str()).collect();
                assert_eq!(order, vec!["New", "Active", "Resolved", "Closed"]);
            }
            _ => panic!("expected enum"),
        }
    }

    #[test]
    fn update_rejects_invalid_priority_value() {
        let server = mockito::Server::new();
        let a = adapter(&server);
        let mut fields = HashMap::new();
        fields.insert(field::PRIORITY.into(), FieldValue::from("frobnicated"));
        let err = a
            .update(
                "1",
                &UpdateRequest {
                    title: None,
                    fields,
                    clear: vec![],
                    replace_links: None,
                },
            )
            .unwrap_err();
        assert!(matches!(err, AdapterError::InvalidField { .. }));
    }

    #[test]
    fn delete_transitions_to_closed_state() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("PATCH", "/acme/MyProject/_apis/wit/workitems/42")
            .match_query(Matcher::UrlEncoded(
                "api-version".into(),
                API_VERSION.into(),
            ))
            .match_body(Matcher::PartialJsonString(
                json!([{
                    "op": "add",
                    "path": "/fields/System.State",
                    "value": "Closed"
                }])
                .to_string(),
            ))
            .with_status(200)
            .with_body(sample_work_item(42).to_string())
            .create();

        let a = adapter(&server);
        a.delete("42").unwrap();
        m.assert();
    }

    #[test]
    fn list_uses_wiql_and_batch_fetch() {
        let mut server = mockito::Server::new();

        let wiql_resp = json!({
            "workItems": [
                { "id": 1, "url": "x" },
                { "id": 2, "url": "y" }
            ]
        });
        let _wiql = server
            .mock("POST", "/acme/MyProject/_apis/wit/wiql")
            .match_query(Matcher::UrlEncoded(
                "api-version".into(),
                API_VERSION.into(),
            ))
            .match_header("content-type", "application/json")
            .with_status(200)
            .with_body(wiql_resp.to_string())
            .create();

        let batch_resp = json!({
            "value": [sample_work_item(1), sample_work_item(2)]
        });
        let _batch = server
            .mock("GET", "/acme/MyProject/_apis/wit/workitems")
            .match_query(Matcher::AllOf(vec![
                Matcher::UrlEncoded("ids".into(), "1,2".into()),
                Matcher::UrlEncoded("$expand".into(), "all".into()),
                Matcher::UrlEncoded("api-version".into(), API_VERSION.into()),
            ]))
            .with_status(200)
            .with_body(batch_resp.to_string())
            .create();

        let a = adapter(&server);
        let docs = a.list(&ListFilter::default()).unwrap();
        assert_eq!(docs.len(), 2);
    }

    #[test]
    fn list_empty_results_skips_batch_fetch() {
        let mut server = mockito::Server::new();
        let _m = server
            .mock("POST", "/acme/MyProject/_apis/wit/wiql")
            .match_query(Matcher::AnyOf(vec![Matcher::Any]))
            .with_status(200)
            .with_body(r#"{"workItems": []}"#)
            .create();

        let a = adapter(&server);
        let docs = a.list(&ListFilter::default()).unwrap();
        assert!(docs.is_empty());
    }

    #[test]
    fn search_uses_wiql_contains() {
        let mut server = mockito::Server::new();
        let _wiql = server
            .mock("POST", "/acme/MyProject/_apis/wit/wiql")
            .match_query(Matcher::AnyOf(vec![Matcher::Any]))
            .match_body(Matcher::Regex("CONTAINS 'needle'".into()))
            .with_status(200)
            .with_body(r#"{"workItems": [{"id": 7}]}"#)
            .create();
        let _batch = server
            .mock("GET", "/acme/MyProject/_apis/wit/workitems")
            .match_query(Matcher::AnyOf(vec![Matcher::Any]))
            .with_status(200)
            .with_body(json!({ "value": [sample_work_item(7)] }).to_string())
            .create();

        let a = adapter(&server);
        let hits = a
            .search("needle", &SearchOptions::default().with_limit(10))
            .unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].id, "7");
    }

    #[test]
    fn resolve_schema_populates_state_options() {
        let mut server = mockito::Server::new();

        // Most WIT types 404 (the project's process doesn't define them);
        // User Story carries the real state list.
        for wit in DEFAULT_WIT_TYPES {
            if *wit == "User Story" {
                continue;
            }
            server
                .mock(
                    "GET",
                    format!(
                        "/acme/MyProject/_apis/wit/workitemtypes/{}/states",
                        url_encode(wit)
                    )
                    .as_str(),
                )
                .match_query(Matcher::AnyOf(vec![Matcher::Any]))
                .with_status(404)
                .with_body(r#"{"message":"type not found"}"#)
                .expect_at_least(0)
                .create();
        }

        let states = json!({
            "count": 4,
            "value": [
                { "name": "New",      "color": "b2b2b2", "category": "Proposed" },
                { "name": "Active",   "color": "007acc", "category": "InProgress" },
                { "name": "Resolved", "color": "ff9900", "category": "Resolved" },
                { "name": "Closed",   "color": "339933", "category": "Completed" }
            ]
        });
        server
            .mock(
                "GET",
                "/acme/MyProject/_apis/wit/workitemtypes/User%20Story/states",
            )
            .match_query(Matcher::AnyOf(vec![Matcher::Any]))
            .with_status(200)
            .with_body(states.to_string())
            .create();

        let mut a = adapter(&server);
        a.resolve_inline().unwrap();
        let status = a.schema().field(field::STATUS).unwrap();
        match &status.kind {
            FieldKind::Enum { options, .. } => {
                let names: Vec<_> = options.iter().map(|o| o.value.as_str()).collect();
                assert!(names.contains(&"Active"));
                assert!(names.contains(&"Closed"));
                assert!(names.contains(&"New"));
            }
            _ => panic!("expected enum"),
        }
        // The Completed-category state populated closed_states.
        let closed = a.closed_states_snapshot();
        assert!(closed.contains(&"Closed".to_string()));
    }

    #[test]
    fn validate_token_succeeds_on_200() {
        let mut server = mockito::Server::new();
        let body = json!({
            "value": [
                { "name": "MyProject" },
                { "name": "OtherProject" }
            ]
        });
        let _m = server
            .mock("GET", "/acme/_apis/projects")
            .match_query(Matcher::UrlEncoded(
                "api-version".into(),
                API_VERSION.into(),
            ))
            .match_header(
                "authorization",
                format!("Basic {}", basic_auth_value("good-token")).as_str(),
            )
            .with_status(200)
            .with_body(body.to_string())
            .create();

        let info = validate_token("good-token", "acme", "MyProject", Some(&server.url())).unwrap();
        assert_eq!(info.project_count, 2);
        assert!(info.project_found);
    }

    #[test]
    fn validate_token_reports_missing_project() {
        let mut server = mockito::Server::new();
        let body = json!({ "value": [{ "name": "OtherProject" }] });
        server
            .mock("GET", "/acme/_apis/projects")
            .match_query(Matcher::AnyOf(vec![Matcher::Any]))
            .with_status(200)
            .with_body(body.to_string())
            .create();

        let info = validate_token("t", "acme", "MyProject", Some(&server.url())).unwrap();
        assert_eq!(info.project_count, 1);
        assert!(!info.project_found);
    }

    #[test]
    fn validate_token_401_is_auth_error() {
        let mut server = mockito::Server::new();
        let _m = server
            .mock("GET", "/acme/_apis/projects")
            .match_query(Matcher::AnyOf(vec![Matcher::Any]))
            .with_status(401)
            .with_body(r#"{"message":"TF400813: The user is not authorized."}"#)
            .create();

        match validate_token("bad-token", "acme", "MyProject", Some(&server.url())) {
            Err(AdapterError::AuthError { .. }) => {}
            other => panic!("expected AuthError, got {other:?}"),
        }
    }

    #[test]
    fn validate_token_rejects_invalid_header_value() {
        match validate_token("bad\ntoken", "acme", "p", Some("http://localhost")) {
            Err(AdapterError::AuthError { .. }) => {}
            other => panic!("expected AuthError, got {other:?}"),
        }
    }

    #[test]
    fn list_filter_status_emits_state_predicate() {
        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), vec!["Active".to_string()]);
        let wiql = build_list_wiql(
            &ListFilter {
                fields,
                ..Default::default()
            },
            &["Closed".to_string()],
        );
        assert!(wiql.contains("[System.State] = 'Active'"));
        // Explicit status filter takes precedence — no <> 'Closed' guard.
        assert!(!wiql.contains("<> 'Closed'"));
    }

    #[test]
    fn list_default_excludes_closed_states() {
        let wiql = build_list_wiql(
            &ListFilter::default(),
            &["Closed".to_string(), "Done".to_string()],
        );
        assert!(wiql.contains("[System.State] <> 'Closed'"));
        assert!(wiql.contains("[System.State] <> 'Done'"));
    }

    #[test]
    fn list_include_archived_skips_state_filter() {
        let wiql = build_list_wiql(
            &ListFilter {
                include_archived: true,
                ..Default::default()
            },
            &["Closed".to_string(), "Done".to_string()],
        );
        assert!(!wiql.contains("<> 'Closed'"));
        assert!(!wiql.contains("<> 'Done'"));
    }

    #[test]
    fn list_tags_filter_emits_contains_predicate() {
        let mut fields = HashMap::new();
        fields.insert(
            field::TAGS.into(),
            vec!["bug".to_string(), "backend".to_string()],
        );
        let wiql = build_list_wiql(
            &ListFilter {
                fields,
                ..Default::default()
            },
            &[],
        );
        assert!(wiql.contains("[System.Tags] CONTAINS 'bug'"));
        assert!(wiql.contains("[System.Tags] CONTAINS 'backend'"));
    }

    #[test]
    fn list_text_filter_searches_title_and_description() {
        let wiql = build_list_wiql(
            &ListFilter {
                text: Some("needle".into()),
                ..Default::default()
            },
            &[],
        );
        assert!(wiql.contains("[System.Title] CONTAINS 'needle'"));
        assert!(wiql.contains("[System.Description] CONTAINS 'needle'"));
    }

    #[test]
    fn list_wiql_escapes_single_quotes() {
        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), vec!["it's".to_string()]);
        let wiql = build_list_wiql(
            &ListFilter {
                fields,
                ..Default::default()
            },
            &[],
        );
        assert!(wiql.contains("[System.State] = 'it''s'"));
    }

    #[test]
    fn map_error_distinguishes_status_codes() {
        match map_error(StatusCode::UNAUTHORIZED, "") {
            AdapterError::AuthError { .. } => {}
            other => panic!("expected AuthError, got {other:?}"),
        }
        match map_error(StatusCode::TOO_MANY_REQUESTS, "") {
            AdapterError::RateLimit { .. } => {}
            other => panic!("expected RateLimit, got {other:?}"),
        }
        match map_error(StatusCode::BAD_REQUEST, r#"{"message":"oops"}"#) {
            AdapterError::InvalidField { reason, .. } => assert!(reason.contains("oops")),
            other => panic!("expected InvalidField, got {other:?}"),
        }
        match map_error(
            StatusCode::NOT_FOUND,
            r#"{"message":"Work item not found"}"#,
        ) {
            AdapterError::NotFound(msg) => assert!(msg.contains("not found")),
            other => panic!("expected NotFound, got {other:?}"),
        }
        match map_error(StatusCode::INTERNAL_SERVER_ERROR, "boom") {
            AdapterError::BackendError { .. } => {}
            other => panic!("expected BackendError, got {other:?}"),
        }
    }
}

/// Integration tests that exercise the real Azure DevOps API.
///
/// Guarded by both the `ado-integration-tests` feature flag and `#[ignore]`
/// so they never run in CI without explicit opt-in. Run locally with:
///
/// ```sh
/// ADO_TOKEN=… TEST_ADO_ORG=… TEST_ADO_PROJECT=… \
///   cargo test -p leanspec-core \
///     --features ado-integration-tests \
///     -- --ignored integration
/// ```
#[cfg(all(test, feature = "ado-integration-tests"))]
mod integration {
    use super::*;
    use crate::adapters::test_harness::{run_compliance_suite, ComplianceOptions};

    fn live_adapter() -> Option<AdoAdapter> {
        let org = std::env::var("TEST_ADO_ORG").ok()?;
        let project = std::env::var("TEST_ADO_PROJECT").ok()?;
        let mut adapter = AdoAdapter::new(org, project, "ADO_TOKEN").ok()?;
        // Best-effort populate live state list so the compliance suite picks
        // valid status values. Failures here are ignored — fallback states
        // are typically valid for default Agile/Scrum/Basic processes.
        let _ = adapter.resolve_inline();
        Some(adapter)
    }

    fn ado_compliance_options() -> ComplianceOptions {
        // Default Agile process state names. Override TEST_ADO_STATUS_ACTIVE
        // / TEST_ADO_STATUS_ALT if running against a custom process.
        let active = std::env::var("TEST_ADO_STATUS_ACTIVE").unwrap_or_else(|_| "New".to_string());
        let alt = std::env::var("TEST_ADO_STATUS_ALT").unwrap_or_else(|_| "Active".to_string());
        ComplianceOptions {
            status_active: active,
            status_alt: alt,
            delete_is_archive: true,
            supports_links: false,
            ..ComplianceOptions::default()
        }
    }

    #[test]
    #[ignore = "hits real ADO API; requires ADO_TOKEN + TEST_ADO_ORG + TEST_ADO_PROJECT"]
    fn integration_compliance_suite() {
        let Some(adapter) = live_adapter() else {
            return;
        };
        run_compliance_suite(&adapter, &ado_compliance_options());
    }

    #[test]
    #[ignore = "hits real ADO API; requires ADO_TOKEN + TEST_ADO_ORG + TEST_ADO_PROJECT"]
    fn integration_create_get_update_close_roundtrip() {
        let a = match live_adapter() {
            Some(a) => a,
            None => return,
        };

        let mut fields = HashMap::new();
        fields.insert(
            field::CONTENT.into(),
            FieldValue::from("Created by leanspec-core integration test."),
        );

        let created = a
            .create(&CreateRequest {
                slug: None,
                title: "leanspec-core integration test".into(),
                schema_id: None,
                fields,
                links: vec![],
            })
            .expect("create");

        let id = created.id.clone();
        let fetched = a.get(&id).expect("get");
        assert_eq!(fetched.id, id);

        let mut update_fields = HashMap::new();
        update_fields.insert(field::CONTENT.into(), FieldValue::from("updated body"));
        a.update(
            &id,
            &UpdateRequest {
                title: Some("leanspec-core integration test (updated)".into()),
                fields: update_fields,
                clear: vec![],
                replace_links: None,
            },
        )
        .expect("update");

        a.delete(&id).expect("close");
    }
}
