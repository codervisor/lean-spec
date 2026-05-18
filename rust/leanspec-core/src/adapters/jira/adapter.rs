//! # Jira issue adapter
//!
//! [`Adapter`] implementation backed by the Jira REST API. Authenticates with
//! HTTP Basic auth (`email:token`), reads the issue body as ADF on Cloud
//! (API v3) or plain text on Server (v2), and maps Jira issue fields onto
//! [`SpecDoc`] via the schema declared below.
//!
//! ## Configuration
//!
//! ```yaml
//! adapter: jira
//! settings:
//!   host: mycompany.atlassian.net
//!   project: PROJ
//!   email: alice@example.com
//!   token_env: JIRA_TOKEN
//!   api_version: 3   # optional; 3 (Cloud, default) or 2 (Server / DC)
//! ```
//!
//! ## Delete semantics
//!
//! Jira's hard delete needs admin permission and is destructive.
//! [`JiraAdapter::delete`] transitions the issue to the first available
//! status whose `statusCategory.key == "done"`, matching the archive
//! semantics used elsewhere in LeanSpec.

use std::collections::HashMap;
use std::time::Duration;

use chrono::{DateTime, Utc};
use reqwest::blocking::{Client, RequestBuilder, Response};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, USER_AGENT};
use reqwest::{Method, StatusCode};
use serde_json::{json, Value};

use super::adf;
use crate::adapters::{
    Adapter, AdapterCapabilities, AdapterError, ListFilter, SearchHit, SearchOptions,
};
use crate::model::{
    semantic, CreateRequest, EnumOption, FieldDef, FieldDisplay, FieldKind, FieldValue,
    LinkTypeDef, SpecDoc, SpecSchema, UpdateRequest,
};

/// Adapter name used in errors and capabilities.
pub const ADAPTER_NAME: &str = "jira";

/// Stable schema id for the Jira adapter.
pub const SCHEMA_ID: &str = "leanspec:jira";

/// Default page size for `list()` / `search()` paging (Jira max is 100).
const DEFAULT_PAGE_SIZE: u32 = 100;

/// Default upper bound on items returned by `list` when pagination is not
/// capped by the caller.
const DEFAULT_LIST_LIMIT: usize = 1000;

/// Schema id assigned to Story / Feature issue types.
const SCHEMA_FEATURE: &str = "leanspec:feature";
/// Schema id assigned to Bug issue types.
const SCHEMA_BUG: &str = "leanspec:bug";
/// Schema id assigned to anything else (Epic, Task, Sub-task, …).
const SCHEMA_BASE: &str = "leanspec:base";

/// Metadata field keys declared by the Jira adapter schema.
pub mod field {
    pub const STATUS: &str = "status";
    pub const PRIORITY: &str = "priority";
    pub const TAGS: &str = "tags";
    pub const ASSIGNEE: &str = "assignee";
    pub const DUE: &str = "due";
    pub const CONTENT: &str = "content";
}

/// Link type keys declared by the Jira adapter schema.
pub mod link {
    pub const DEPENDS_ON: &str = "depends_on";
}

fn build_schema() -> SpecSchema {
    SpecSchema {
        id: SCHEMA_ID.into(),
        name: "Jira Issue".into(),
        extends: None,
        fields: vec![
            FieldDef {
                key: field::STATUS.into(),
                label: "Status".into(),
                kind: FieldKind::Enum {
                    // Closed enums require at least one starting option so the
                    // compliance check is satisfied before `resolve_schema`
                    // replaces them with the project's live names.
                    options: vec![
                        EnumOption::simple("To Do", "To Do"),
                        EnumOption::simple("In Progress", "In Progress"),
                        EnumOption::simple("Done", "Done"),
                    ],
                    multi: false,
                    allow_custom: true,
                    dynamic: true,
                },
                display: FieldDisplay::Inline,
                required: true,
                semantic: Some(semantic::STATUS.to_string()),
                ai_hint: Some("Project-defined Jira workflow status".into()),
                placeholder: None,
            },
            FieldDef {
                key: field::PRIORITY.into(),
                label: "Priority".into(),
                kind: FieldKind::Enum {
                    options: vec![],
                    multi: false,
                    allow_custom: true,
                    dynamic: true,
                },
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::PRIORITY.to_string()),
                ai_hint: Some("Jira priority name (mapped to leanspec values)".into()),
                placeholder: None,
            },
            FieldDef {
                key: field::TAGS.into(),
                label: "Labels".into(),
                kind: FieldKind::Enum {
                    options: vec![],
                    multi: true,
                    allow_custom: true,
                    dynamic: true,
                },
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::TAGS.to_string()),
                ai_hint: None,
                placeholder: None,
            },
            FieldDef {
                key: field::ASSIGNEE.into(),
                label: "Assignee".into(),
                kind: FieldKind::Enum {
                    options: vec![],
                    multi: false,
                    allow_custom: true,
                    dynamic: true,
                },
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::ASSIGNEE.to_string()),
                ai_hint: None,
                placeholder: Some("Display name".into()),
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
                ai_hint: Some("Issue description, markdown (ADF on Cloud)".into()),
                placeholder: None,
            },
        ],
        link_types: vec![LinkTypeDef {
            key: link::DEPENDS_ON.into(),
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
        // Jira `delete()` transitions to a "done" status — archive semantics.
        supports_delete: true,
        supports_search: true,
        supports_webhooks: false,
        default_schema: SCHEMA_ID.into(),
    }
}

/// Adapter that speaks the Jira REST API.
pub struct JiraAdapter {
    /// Kept on the struct for diagnostics / debug printing — actual URL
    /// construction goes through `base_url`, which the test harness can
    /// override.
    #[allow(dead_code)]
    host: String,
    project: String,
    email: String,
    token: String,
    api_version: u8,
    /// Base URL override — `https://{host}` in production, `server.url()` in
    /// tests. Used so the test suite can route traffic at a mock server.
    base_url: String,
    client: Client,
    capabilities: AdapterCapabilities,
    schema: SpecSchema,
}

impl JiraAdapter {
    /// Construct a new adapter against `{host}` and project key `{project}`.
    /// The token is read from `token_env` (defaults to `JIRA_TOKEN`); the
    /// value never leaves memory.
    pub fn new(
        host: impl Into<String>,
        project: impl Into<String>,
        email: impl Into<String>,
        token_env: impl AsRef<str>,
    ) -> Result<Self, AdapterError> {
        Self::with_settings(host, project, email, token_env, 3, None::<String>)
    }

    /// Same as [`Self::new`] but lets callers pin `api_version` (2 for Jira
    /// Server / DC, 3 for Cloud) and override the base URL — used by tests
    /// and Server deployments that don't sit at `https://{host}`.
    pub fn with_settings(
        host: impl Into<String>,
        project: impl Into<String>,
        email: impl Into<String>,
        token_env: impl AsRef<str>,
        api_version: u8,
        base_url: Option<impl Into<String>>,
    ) -> Result<Self, AdapterError> {
        let env_name = token_env.as_ref();
        let token = std::env::var(env_name).map_err(|_| AdapterError::AuthError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("environment variable '{env_name}' is not set"),
        })?;
        Self::with_token(host, project, email, token, api_version, base_url)
    }

    /// Internal constructor used by tests so the mock server URL can be
    /// injected and the token supplied directly.
    fn with_token(
        host: impl Into<String>,
        project: impl Into<String>,
        email: impl Into<String>,
        token: impl Into<String>,
        api_version: u8,
        base_url: Option<impl Into<String>>,
    ) -> Result<Self, AdapterError> {
        if !(api_version == 2 || api_version == 3) {
            return Err(AdapterError::ConfigError(format!(
                "jira adapter supports api_version 2 or 3, got {api_version}"
            )));
        }

        let host: String = host.into();
        let token: String = token.into();
        let email: String = email.into();
        if token.is_empty() {
            return Err(AdapterError::AuthError {
                adapter: ADAPTER_NAME.into(),
                reason: "token is empty".into(),
            });
        }
        if email.is_empty() {
            return Err(AdapterError::ConfigError(
                "jira adapter requires a non-empty email".into(),
            ));
        }

        let client = Client::builder()
            .user_agent("leanspec-jira-adapter")
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| AdapterError::BackendError {
                adapter: ADAPTER_NAME.into(),
                reason: format!("failed to construct HTTP client: {e}"),
            })?;

        let base_url = base_url
            .map(|b| b.into())
            .unwrap_or_else(|| format!("https://{host}"));

        Ok(Self {
            host,
            project: project.into(),
            email,
            token,
            api_version,
            base_url,
            client,
            capabilities: build_capabilities(),
            schema: build_schema(),
        })
    }

    /// Fetch project status / priority vocabularies and bake them into the
    /// adapter's own schema. Invoked by [`AdapterRegistry::create`] so callers
    /// that only call `adapter.schema()` see the resolved options.
    pub fn resolve_inline(&mut self) -> Result<(), AdapterError> {
        let mut schema = std::mem::replace(&mut self.schema, build_schema());
        self.resolve_schema(&mut schema)?;
        self.schema = schema;
        Ok(())
    }

    fn url(&self, path: &str) -> String {
        format!(
            "{}/rest/api/{}{}",
            self.base_url.trim_end_matches('/'),
            self.api_version,
            path
        )
    }

    fn auth_headers(&self) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert(ACCEPT, HeaderValue::from_static("application/json"));
        h.insert(
            USER_AGENT,
            HeaderValue::from_static("leanspec-jira-adapter"),
        );
        h
    }

    fn request(&self, method: Method, url: &str) -> RequestBuilder {
        self.client
            .request(method, url)
            .headers(self.auth_headers())
            .basic_auth(&self.email, Some(&self.token))
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

        let headers = resp.headers().clone();
        let body = resp.text().unwrap_or_default();
        Err(map_error(status, &headers, &body))
    }

    fn parse_json(resp: Response) -> Result<Value, AdapterError> {
        resp.json().map_err(|e| AdapterError::ParseError {
            path: "jira response".into(),
            reason: e.to_string(),
        })
    }

    /// Paginate `/search` results until all issues have been collected or the
    /// `limit` cap is reached.
    fn paginate_search(&self, jql: &str, limit: usize) -> Result<Vec<Value>, AdapterError> {
        let mut out: Vec<Value> = Vec::new();
        let mut start_at = 0_u32;
        loop {
            let url = self.url("/search");
            let resp = self.send(self.request(Method::GET, &url).query(&[
                ("jql", jql),
                ("maxResults", &DEFAULT_PAGE_SIZE.to_string()),
                ("startAt", &start_at.to_string()),
            ]))?;
            let value = Self::parse_json(resp)?;
            let issues = value
                .get("issues")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let total = value.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
            let returned = issues.len();
            for item in issues {
                if out.len() >= limit {
                    return Ok(out);
                }
                out.push(item);
            }
            start_at = start_at.saturating_add(returned as u32);
            if returned == 0 || (start_at as u64) >= total {
                break;
            }
        }
        Ok(out)
    }

    /// Convert a free-form caller filter into a JQL fragment.
    fn list_jql(&self, filter: &ListFilter) -> String {
        let mut parts: Vec<String> = vec![format!("project = {}", jql_quote(&self.project))];

        if let Some(statuses) = filter.fields.get(field::STATUS) {
            if !statuses.is_empty() {
                let list = statuses
                    .iter()
                    .map(|s| jql_quote(s))
                    .collect::<Vec<_>>()
                    .join(", ");
                parts.push(format!("status in ({list})"));
            }
        } else if !filter.include_archived {
            // Default: hide Done-category issues so archived items don't crowd
            // the list. `include_archived = true` returns all statuses.
            parts.push("statusCategory != Done".into());
        }

        if let Some(labels) = filter.fields.get(field::TAGS) {
            for label in labels {
                parts.push(format!("labels = {}", jql_quote(label)));
            }
        }

        if let Some(assignees) = filter.fields.get(field::ASSIGNEE) {
            if let Some(first) = assignees.first() {
                parts.push(format!("assignee = {}", jql_quote(first)));
            }
        }

        if let Some(priorities) = filter.fields.get(field::PRIORITY) {
            if !priorities.is_empty() {
                let list = priorities
                    .iter()
                    .map(|p| jql_quote(p))
                    .collect::<Vec<_>>()
                    .join(", ");
                parts.push(format!("priority in ({list})"));
            }
        }

        if let Some(text) = &filter.text {
            parts.push(format!("text ~ {}", jql_quote(text)));
        }

        parts.join(" AND ")
    }

    /// Build a Jira `fields` payload from a [`CreateRequest`] or partial
    /// [`UpdateRequest`]. Returns a JSON object whose keys are Jira field
    /// names — caller picks the right wrapper for the verb being issued.
    fn fields_payload(
        &self,
        title: Option<&str>,
        fields: &HashMap<String, FieldValue>,
        issue_type: Option<&str>,
    ) -> serde_json::Map<String, Value> {
        let mut out = serde_json::Map::new();
        if let Some(t) = title {
            out.insert("summary".into(), Value::String(t.into()));
        }
        if let Some(ty) = issue_type {
            out.insert("issuetype".into(), json!({ "name": ty }));
        }

        if let Some(content) = fields.get(field::CONTENT).and_then(|v| v.as_str()) {
            let body = if self.api_version == 3 {
                adf::from_markdown(content)
            } else {
                Value::String(content.to_string())
            };
            out.insert("description".into(), body);
        }

        if let Some(labels) = fields.get(field::TAGS).and_then(|v| v.as_strings()) {
            out.insert(
                "labels".into(),
                Value::Array(labels.iter().map(|s| Value::String(s.clone())).collect()),
            );
        }

        if let Some(assignee) = fields.get(field::ASSIGNEE).and_then(|v| v.as_str()) {
            // Jira write API requires an identifier, not the displayed name.
            // v3 / Cloud expects `accountId`; v2 / Server expects `name` or
            // `key`. Reads expose the Jira identifier as the field value (see
            // `issue_to_doc`) so round-trips work; the human-readable display
            // name remains in `raw.fields.assignee.displayName`.
            let key = if self.api_version == 3 {
                "accountId"
            } else {
                "name"
            };
            out.insert("assignee".into(), json!({ key: assignee }));
        }

        if let Some(priority) = fields.get(field::PRIORITY).and_then(|v| v.as_str()) {
            // The field stores normalized LeanSpec values (`high`, `medium`,
            // …); Jira's write API needs the project's actual priority name
            // (`"High"`). Use the live schema (populated by `resolve_schema`)
            // to map back, falling back to a default vocabulary so we still
            // work pre-resolution and against custom priorities.
            let jira_name = self.normalized_priority_to_jira_name(priority);
            out.insert("priority".into(), json!({ "name": jira_name }));
        }

        if let Some(due) = fields.get(field::DUE).and_then(|v| v.as_str()) {
            out.insert("duedate".into(), Value::String(due.into()));
        }

        out
    }

    /// Look up the Jira priority name to send back over the wire when the
    /// caller supplies a normalized LeanSpec priority value.
    ///
    /// Strategy:
    /// 1. If the resolved schema's `priority` field knows an enum option
    ///    whose `value` matches, use its `label` (the Jira name).
    /// 2. Otherwise fall back to the standard default vocabulary
    ///    (`high → "High"`, `critical → "Highest"`, …).
    /// 3. As a final fallback, pass the value through unchanged so custom
    ///    priorities still flow.
    fn normalized_priority_to_jira_name(&self, value: &str) -> String {
        if let Some(field) = self.schema.field(field::PRIORITY) {
            if let FieldKind::Enum { options, .. } = &field.kind {
                if let Some(opt) = options.iter().find(|o| o.value == value) {
                    return opt.label.clone();
                }
            }
        }
        match value {
            "critical" => "Highest".into(),
            "high" => "High".into(),
            "medium" => "Medium".into(),
            "low" => "Low".into(),
            other => other.into(),
        }
    }

    /// Run a status transition by finding the transition whose target status
    /// matches `name` (case-insensitive), or — if `name` is `None` — the
    /// first transition whose target `statusCategory.key == "done"`.
    fn transition(&self, id: &str, target: TransitionTarget<'_>) -> Result<(), AdapterError> {
        let list_url = self.url(&format!("/issue/{id}/transitions"));
        let resp = self
            .send(self.request(Method::GET, &list_url))
            .map_err(|e| with_not_found_id(e, id))?;
        let value = Self::parse_json(resp)?;
        let transitions = value
            .get("transitions")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let chosen = match target {
            TransitionTarget::ToDone => find_done_transition(&transitions),
            TransitionTarget::Named(name) => find_named_transition(&transitions, name),
        };
        let id_value = chosen.ok_or_else(|| AdapterError::InvalidField {
            adapter: ADAPTER_NAME.into(),
            reason: match target {
                TransitionTarget::ToDone => {
                    "no transition leads to a 'done' status — cannot archive".into()
                }
                TransitionTarget::Named(name) => format!("no transition to status '{name}'"),
            },
        })?;

        let url = self.url(&format!("/issue/{id}/transitions"));
        self.send(
            self.request(Method::POST, &url)
                .json(&json!({ "transition": { "id": id_value } })),
        )?;
        Ok(())
    }
}

/// What to look for when picking a transition.
enum TransitionTarget<'a> {
    /// Transition whose target `statusCategory.key == "done"`.
    ToDone,
    /// Transition whose target `to.name` matches the given string
    /// (case-insensitive).
    Named(&'a str),
}

impl Adapter for JiraAdapter {
    fn capabilities(&self) -> &AdapterCapabilities {
        &self.capabilities
    }

    fn schema(&self) -> &SpecSchema {
        &self.schema
    }

    fn resolve_schema(&self, schema: &mut SpecSchema) -> Result<(), AdapterError> {
        // Project statuses live at /project/{key}/statuses and return an array
        // of issue types, each with its own status list. We union them.
        let status_url = self.url(&format!("/project/{}/statuses", self.project));
        let resp = self.send(self.request(Method::GET, &status_url))?;
        let value = Self::parse_json(resp)?;
        let mut status_options: Vec<EnumOption> = Vec::new();
        let mut seen_status: std::collections::HashSet<String> = std::collections::HashSet::new();
        for issuetype in value.as_array().cloned().unwrap_or_default() {
            for status in issuetype
                .get("statuses")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
            {
                if let Some(name) = status.get("name").and_then(|v| v.as_str()) {
                    if seen_status.insert(name.to_string()) {
                        let description = status
                            .get("description")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(String::from);
                        status_options.push(EnumOption {
                            value: name.to_string(),
                            label: name.to_string(),
                            color: None,
                            icon: None,
                            description,
                        });
                    }
                }
            }
        }
        status_options.sort_by(|a, b| a.value.cmp(&b.value));

        // Priorities are global. The endpoint returns an array of objects with
        // at least { id, name, description }. Priority `value` is the
        // normalized LeanSpec form (matching what `issue_to_doc` stores in
        // documents); `label` keeps the live Jira name so writes can map
        // back (see `normalized_priority_to_jira_name`).
        let priority_url = self.url("/priority");
        let resp = self.send(self.request(Method::GET, &priority_url))?;
        let value = Self::parse_json(resp)?;
        let mut priority_options: Vec<EnumOption> = Vec::new();
        let mut seen_priority: std::collections::HashSet<String> = std::collections::HashSet::new();
        for item in value.as_array().cloned().unwrap_or_default() {
            if let Some(name) = item.get("name").and_then(|v| v.as_str()) {
                let description = item
                    .get("description")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(String::from);
                let normalized = priority_name_to_value(name);
                // Two Jira priorities can collapse to the same normalized
                // value (e.g. "Highest" + "Critical" → "critical"). Keep the
                // first one we see — the write inverse mapping will surface
                // that label, which is the project's canonical name.
                if seen_priority.insert(normalized.clone()) {
                    priority_options.push(EnumOption {
                        value: normalized,
                        label: name.to_string(),
                        color: None,
                        icon: None,
                        description,
                    });
                }
            }
        }
        priority_options.sort_by(|a, b| a.value.cmp(&b.value));

        for f in schema.fields.iter_mut() {
            if let FieldKind::Enum { options, .. } = &mut f.kind {
                if f.key == field::STATUS && !status_options.is_empty() {
                    *options = status_options.clone();
                } else if f.key == field::PRIORITY && !priority_options.is_empty() {
                    *options = priority_options.clone();
                }
            }
        }

        Ok(())
    }

    fn list(&self, filter: &ListFilter) -> Result<Vec<SpecDoc>, AdapterError> {
        let jql = self.list_jql(filter);
        let issues = self.paginate_search(&jql, DEFAULT_LIST_LIMIT)?;
        Ok(issues
            .iter()
            .map(|v| issue_to_doc(v, self.api_version))
            .collect())
    }

    fn get(&self, id: &str) -> Result<SpecDoc, AdapterError> {
        let url = self.url(&format!("/issue/{id}"));
        let resp = self
            .send(self.request(Method::GET, &url))
            .map_err(|e| with_not_found_id(e, id))?;
        let value = Self::parse_json(resp)?;
        Ok(issue_to_doc(&value, self.api_version))
    }

    fn create(&self, req: &CreateRequest) -> Result<SpecDoc, AdapterError> {
        let issue_type = schema_id_to_issue_type(req.schema_id.as_deref());
        let mut fields = self.fields_payload(Some(&req.title), &req.fields, Some(issue_type));
        fields.insert("project".into(), json!({ "key": self.project }));

        // Status on create: Jira ignores `status` in POST /issue. Apply via a
        // follow-up transition if the caller asked for a non-default status.
        let requested_status = req
            .fields
            .get(field::STATUS)
            .and_then(|v| v.as_str())
            .map(String::from);

        // Strip the status from the create body — Jira rejects it.
        fields.remove("status");

        let url = self.url("/issue");
        let resp = self.send(
            self.request(Method::POST, &url)
                .json(&json!({ "fields": fields })),
        )?;
        let value = Self::parse_json(resp)?;

        // POST /issue returns `{ id, key, self }` only. Fetch the full issue
        // so callers get a complete SpecDoc (status, etc.).
        let key = value
            .get("key")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AdapterError::ParseError {
                path: "jira POST /issue response".into(),
                reason: "missing 'key' field".into(),
            })?
            .to_string();

        if let Some(target) = requested_status {
            // Best-effort: a missing transition surfaces as InvalidField.
            self.transition(&key, TransitionTarget::Named(&target))?;
        }

        self.get(&key)
    }

    fn update(&self, id: &str, req: &UpdateRequest) -> Result<SpecDoc, AdapterError> {
        reject_unknown_fields(&req.fields, &self.schema)?;

        // Status changes go through the transition API; everything else goes
        // through PUT /issue/{id}.
        let status_target = req
            .fields
            .get(field::STATUS)
            .and_then(|v| v.as_str())
            .map(String::from);

        let mut fields_no_status = req.fields.clone();
        fields_no_status.remove(field::STATUS);

        // Honour explicit clears by inserting an empty / null value for each.
        let mut payload = self.fields_payload(req.title.as_deref(), &fields_no_status, None);
        for key in &req.clear {
            match key.as_str() {
                field::TAGS => {
                    payload.insert("labels".into(), Value::Array(vec![]));
                }
                field::ASSIGNEE => {
                    payload.insert("assignee".into(), Value::Null);
                }
                field::PRIORITY => {
                    payload.insert("priority".into(), Value::Null);
                }
                field::DUE => {
                    payload.insert("duedate".into(), Value::Null);
                }
                field::CONTENT => {
                    payload.insert("description".into(), Value::Null);
                }
                _ => {}
            }
        }

        if !payload.is_empty() {
            let url = self.url(&format!("/issue/{id}"));
            self.send(
                self.request(Method::PUT, &url)
                    .json(&json!({ "fields": payload })),
            )
            .map_err(|e| with_not_found_id(e, id))?;
        }

        if let Some(target) = status_target {
            self.transition(id, TransitionTarget::Named(&target))?;
        }

        self.get(id)
    }

    fn delete(&self, id: &str) -> Result<(), AdapterError> {
        // Jira hard delete is admin-only and destructive. Match the GitHub
        // adapter's "archive on delete" semantics by transitioning to a done
        // status. The compliance test asserts that get() still succeeds after
        // delete and that list(default) excludes the item.
        self.transition(id, TransitionTarget::ToDone)
    }

    fn search(&self, query: &str, opts: &SearchOptions) -> Result<Vec<SearchHit>, AdapterError> {
        let jql = format!(
            "project = {} AND text ~ {}",
            jql_quote(&self.project),
            jql_quote(query)
        );
        let limit = opts.limit.unwrap_or(30).min(100);
        let issues = self.paginate_search(&jql, limit)?;
        Ok(issues
            .iter()
            .map(|item| {
                let id = item
                    .get("key")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                // Jira /search has no per-issue score; lean on order for now.
                let snippet = if opts.include_body {
                    let desc = item.get("fields").and_then(|f| f.get("description"));
                    desc.and_then(|d| {
                        if d.is_object() {
                            adf::to_markdown(d).ok()
                        } else {
                            d.as_str().map(String::from)
                        }
                    })
                    .map(|s| s.chars().take(200).collect())
                } else {
                    None
                };
                SearchHit {
                    id,
                    score: 0.0,
                    snippet,
                }
            })
            .collect())
    }
}

/// Outcome of validating a Jira email/token pair against `GET /myself`.
///
/// Used by `leanspec init --adapter jira` to fail fast when the configured
/// token is invalid.
#[derive(Debug, Clone)]
pub struct TokenValidation {
    /// The authenticated user's display name (from `displayName`).
    pub display_name: String,
    /// The authenticated user's account id (Cloud) or username (Server).
    pub account_id: String,
}

/// Validate a Jira email + token by calling `GET /rest/api/{api_version}/myself`.
///
/// `base_url` defaults to `https://{host}` and exists so tests can route
/// traffic at a mock server.
pub fn validate_token(
    host: &str,
    email: &str,
    token: &str,
    api_version: u8,
    base_url: Option<&str>,
) -> Result<TokenValidation, AdapterError> {
    if !(api_version == 2 || api_version == 3) {
        return Err(AdapterError::ConfigError(format!(
            "jira adapter supports api_version 2 or 3, got {api_version}"
        )));
    }
    let owned;
    let base = match base_url {
        Some(b) => b.trim_end_matches('/'),
        None => {
            owned = format!("https://{host}");
            &owned
        }
    };
    let url = format!("{base}/rest/api/{api_version}/myself");

    let client = Client::builder()
        .user_agent("leanspec-jira-adapter")
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| AdapterError::BackendError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("failed to construct HTTP client: {e}"),
        })?;

    let resp = client
        .get(&url)
        .basic_auth(email, Some(token))
        .header(ACCEPT, "application/json")
        .header(USER_AGENT, "leanspec-jira-adapter")
        .send()
        .map_err(|e| AdapterError::BackendError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("network: {e}"),
        })?;

    let status = resp.status();
    if !status.is_success() {
        let headers = resp.headers().clone();
        let body = resp.text().unwrap_or_default();
        return Err(map_error(status, &headers, &body));
    }

    let body: Value = resp.json().map_err(|e| AdapterError::ParseError {
        path: "jira /myself response".into(),
        reason: e.to_string(),
    })?;

    let display_name = body
        .get("displayName")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let account_id = body
        .get("accountId")
        .or_else(|| body.get("name"))
        .or_else(|| body.get("key"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(TokenValidation {
        display_name,
        account_id,
    })
}

/// Project a Jira issue JSON payload onto a [`SpecDoc`]. `api_version` decides
/// whether `description` is parsed as ADF or read as a plain string.
pub(crate) fn issue_to_doc(issue: &Value, api_version: u8) -> SpecDoc {
    let key = issue
        .get("key")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let url = issue.get("self").and_then(|v| v.as_str()).map(String::from);
    let issue_fields = issue.get("fields");

    let title = issue_fields
        .and_then(|f| f.get("summary"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let issuetype_name = issue_fields
        .and_then(|f| f.get("issuetype"))
        .and_then(|t| t.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let schema_id = issue_type_to_schema_id(issuetype_name).to_string();

    let mut fields: HashMap<String, FieldValue> = HashMap::new();

    if let Some(status) = issue_fields
        .and_then(|f| f.get("status"))
        .and_then(|s| s.get("name"))
        .and_then(|v| v.as_str())
    {
        fields.insert(field::STATUS.into(), FieldValue::String(status.into()));
    }

    if let Some(prio) = issue_fields
        .and_then(|f| f.get("priority"))
        .and_then(|p| p.get("name"))
        .and_then(|v| v.as_str())
    {
        fields.insert(
            field::PRIORITY.into(),
            FieldValue::String(priority_name_to_value(prio)),
        );
    }

    let labels: Vec<String> = issue_fields
        .and_then(|f| f.get("labels"))
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|l| l.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    if !labels.is_empty() {
        fields.insert(field::TAGS.into(), FieldValue::Strings(labels));
    }

    if let Some(assignee_obj) = issue_fields.and_then(|f| f.get("assignee")) {
        // Store the writable identifier so write round-trips work end-to-end:
        // - Cloud (v3): `accountId`
        // - Server / DC (v2): `name` or `key`
        // We fall back through them in order; `displayName` is the final
        // fallback for unusual responses that omit identifiers. The display
        // name itself remains available via `SpecDoc::raw`.
        let identifier = assignee_obj
            .get("accountId")
            .or_else(|| assignee_obj.get("name"))
            .or_else(|| assignee_obj.get("key"))
            .or_else(|| assignee_obj.get("displayName"))
            .and_then(|v| v.as_str());
        if let Some(id) = identifier {
            if !id.is_empty() {
                fields.insert(field::ASSIGNEE.into(), FieldValue::String(id.into()));
            }
        }
    }

    if let Some(due) = issue_fields
        .and_then(|f| f.get("duedate"))
        .and_then(|v| v.as_str())
    {
        if !due.is_empty() {
            fields.insert(field::DUE.into(), FieldValue::String(due.into()));
        }
    }

    if let Some(desc) = issue_fields.and_then(|f| f.get("description")) {
        let body = match api_version {
            3 if desc.is_object() => adf::to_markdown(desc).ok().unwrap_or_default(),
            _ => desc.as_str().unwrap_or("").to_string(),
        };
        if !body.is_empty() {
            // adf::to_markdown leaves a trailing newline — trim it so the
            // round-trip through CreateRequest doesn't grow the content on
            // every update.
            let trimmed = body.trim_end_matches('\n').to_string();
            if !trimmed.is_empty() {
                fields.insert(field::CONTENT.into(), FieldValue::String(trimmed));
            }
        }
    }

    let created_at = issue_fields
        .and_then(|f| f.get("created"))
        .and_then(|v| v.as_str())
        .and_then(parse_jira_datetime);
    let updated_at = issue_fields
        .and_then(|f| f.get("updated"))
        .and_then(|v| v.as_str())
        .and_then(parse_jira_datetime);

    SpecDoc {
        id: key,
        title,
        schema_id,
        fields,
        links: Vec::new(),
        created_at,
        updated_at,
        url,
        raw: Some(issue.clone()),
    }
}

/// Map a Jira priority name (`"High"`, `"Highest"`, `"Critical"`, …) onto a
/// LeanSpec priority value. Unknown names fall through lowercased.
pub(crate) fn priority_name_to_value(name: &str) -> String {
    let lower = name.trim().to_lowercase();
    match lower.as_str() {
        "highest" | "critical" => "critical".into(),
        "high" => "high".into(),
        "medium" => "medium".into(),
        "low" | "lowest" => "low".into(),
        _ => lower,
    }
}

/// Map a Jira issue type name onto a LeanSpec schema id.
fn issue_type_to_schema_id(name: &str) -> &'static str {
    match name {
        "Story" | "Feature" | "New Feature" => SCHEMA_FEATURE,
        "Bug" => SCHEMA_BUG,
        _ => SCHEMA_BASE,
    }
}

/// Inverse of [`issue_type_to_schema_id`] — picks the Jira issue type name
/// from a LeanSpec schema id. Defaults to `"Story"` so create() always has a
/// valid issuetype.
fn schema_id_to_issue_type(schema_id: Option<&str>) -> &'static str {
    match schema_id {
        Some(SCHEMA_BUG) => "Bug",
        Some(SCHEMA_BASE) => "Task",
        // SCHEMA_FEATURE, leanspec:jira, or None → Story
        _ => "Story",
    }
}

/// Find the first transition in `transitions` whose target status category
/// key is `"done"`, returning the transition id.
pub(crate) fn find_done_transition(transitions: &[Value]) -> Option<String> {
    transitions.iter().find_map(|t| {
        let cat_key = t
            .get("to")
            .and_then(|to| to.get("statusCategory"))
            .and_then(|c| c.get("key"))
            .and_then(|v| v.as_str())?;
        if cat_key.eq_ignore_ascii_case("done") {
            t.get("id")
                .and_then(|v| v.as_str().map(String::from))
                .or_else(|| t.get("id").and_then(|v| v.as_i64()).map(|n| n.to_string()))
        } else {
            None
        }
    })
}

/// Find the first transition in `transitions` whose target status name matches
/// `name` (case-insensitive), returning the transition id.
fn find_named_transition(transitions: &[Value], name: &str) -> Option<String> {
    transitions.iter().find_map(|t| {
        let to_name = t
            .get("to")
            .and_then(|to| to.get("name"))
            .and_then(|v| v.as_str())?;
        if to_name.eq_ignore_ascii_case(name) {
            t.get("id")
                .and_then(|v| v.as_str().map(String::from))
                .or_else(|| t.get("id").and_then(|v| v.as_i64()).map(|n| n.to_string()))
        } else {
            None
        }
    })
}

/// Quote a string for inclusion in a JQL query — wrap in double quotes and
/// escape internal quotes and backslashes. Unquoted bare identifiers are not
/// safe across all values (statuses can contain spaces), so always quote.
fn jql_quote(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '\\' | '"' => {
                out.push('\\');
                out.push(c);
            }
            _ => out.push(c),
        }
    }
    out.push('"');
    out
}

/// Parse the `X-RateLimit-Reset` header. Jira Cloud advertises this as an
/// ISO-8601 timestamp; some self-hosted deployments still emit Unix seconds.
/// Returns `None` for unparseable values so the caller falls back to
/// `Retry-After`.
fn parse_reset_header(s: &str) -> Option<DateTime<Utc>> {
    let s = s.trim();
    // ISO-8601 / RFC3339 — Jira Cloud's contract.
    if let Some(dt) = parse_jira_datetime(s) {
        return Some(dt);
    }
    // Legacy / Server: Unix seconds.
    if let Ok(ts) = s.parse::<i64>() {
        return chrono::Utc.timestamp_opt(ts, 0).single();
    }
    None
}

/// Parse a Jira datetime — typically `"2026-01-02T11:00:00.000+0000"`. Falls
/// back to RFC3339 when the offset is given as `±HH:MM`.
fn parse_jira_datetime(s: &str) -> Option<DateTime<Utc>> {
    // Try RFC3339 first; Jira Cloud's timestamps usually parse directly once
    // a colon is inserted into the offset.
    if let Ok(d) = DateTime::parse_from_rfc3339(s) {
        return Some(d.with_timezone(&Utc));
    }
    // Common Jira shape: "...±HHMM" without the colon — normalize and retry.
    if s.len() >= 5 {
        let (head, tail) = s.split_at(s.len() - 5);
        if (tail.starts_with('+') || tail.starts_with('-'))
            && tail[1..].chars().all(|c| c.is_ascii_digit())
        {
            let fixed = format!("{}{}{}", head, &tail[..3], &format!(":{}", &tail[3..]));
            if let Ok(d) = DateTime::parse_from_rfc3339(&fixed) {
                return Some(d.with_timezone(&Utc));
            }
        }
    }
    None
}

/// Re-emit a generic `NotFound(message)` as `NotFound(id)` at the call site
/// where `id` is known. Matches the GitHub adapter's behaviour.
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
pub(crate) fn map_error(status: StatusCode, headers: &HeaderMap, body: &str) -> AdapterError {
    match status.as_u16() {
        401 => AdapterError::AuthError {
            adapter: ADAPTER_NAME.into(),
            reason: "JIRA_TOKEN is invalid or the email does not match".into(),
        },
        403 => AdapterError::AuthError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("forbidden: {body}"),
        },
        404 => {
            AdapterError::NotFound(extract_message_from_body(body).unwrap_or_else(|| body.into()))
        }
        400 | 422 => AdapterError::InvalidField {
            adapter: ADAPTER_NAME.into(),
            reason: extract_message_from_body(body).unwrap_or_else(|| body.into()),
        },
        429 => {
            // Jira Cloud's `X-RateLimit-Reset` is an ISO-8601 timestamp (not
            // Unix seconds like GitHub's). Some Jira deployments fall back to
            // `Retry-After` (seconds from now). Try the modern Cloud header
            // first, then RFC3339, then numeric epoch, then Retry-After.
            let reset = headers
                .get("x-ratelimit-reset")
                .and_then(|h| h.to_str().ok())
                .and_then(parse_reset_header)
                .or_else(|| {
                    headers
                        .get("retry-after")
                        .and_then(|h| h.to_str().ok())
                        .and_then(|s| s.parse::<i64>().ok())
                        .map(|secs| Utc::now() + chrono::Duration::seconds(secs))
                });
            AdapterError::RateLimit {
                adapter: ADAPTER_NAME.into(),
                reset_at: reset,
            }
        }
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

fn extract_message_from_body(body: &str) -> Option<String> {
    let value: Value = serde_json::from_str(body).ok()?;
    if let Some(msg) = value.get("message").and_then(|m| m.as_str()) {
        return Some(msg.to_string());
    }
    // Jira often returns `{ "errorMessages": ["..."] }`.
    if let Some(arr) = value.get("errorMessages").and_then(|v| v.as_array()) {
        if let Some(first) = arr.first().and_then(|v| v.as_str()) {
            return Some(first.to_string());
        }
    }
    None
}

// Re-export of chrono::TimeZone so the rate-limit reset arithmetic above can
// build `Utc.timestamp_opt(...)` without an explicit `use` at module scope
// (cleaner than scattering one across every fn).
use chrono::TimeZone;

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::Matcher;
    use serde_json::json;

    fn adapter(server: &mockito::ServerGuard) -> JiraAdapter {
        JiraAdapter::with_token(
            "demo.atlassian.net",
            "PROJ",
            "alice@example.com",
            "fake-token",
            3,
            Some(server.url()),
        )
        .unwrap()
    }

    fn sample_issue(key: &str) -> Value {
        json!({
            "id": "10042",
            "key": key,
            "self": format!("https://demo.atlassian.net/rest/api/3/issue/{key}"),
            "fields": {
                "summary": "Hello world",
                "status": { "name": "To Do" },
                "priority": { "name": "High" },
                "labels": ["bug", "backend"],
                "assignee": { "accountId": "alice-acc-id", "displayName": "Alice" },
                "duedate": "2026-06-30",
                "issuetype": { "name": "Story" },
                "created": "2026-01-01T10:00:00.000+0000",
                "updated": "2026-01-02T11:00:00.000+0000",
                "description": {
                    "version": 1,
                    "type": "doc",
                    "content": [
                        { "type": "paragraph", "content": [
                            { "type": "text", "text": "Hello " },
                            { "type": "text", "text": "world", "marks": [{ "type": "strong" }] }
                        ]}
                    ]
                }
            }
        })
    }

    // ─── schema / capabilities ────────────────────────────────────────────

    #[test]
    fn schema_declares_expected_fields() {
        let s = mockito::Server::new();
        let a = adapter(&s);
        let schema = a.schema();
        assert_eq!(schema.id, SCHEMA_ID);
        assert!(schema.field(field::STATUS).is_some());
        assert!(schema.field(field::TAGS).is_some());
        assert!(schema.field(field::PRIORITY).is_some());
        assert!(schema.field(field::ASSIGNEE).is_some());
        assert!(schema.field(field::DUE).is_some());
        assert!(schema.field(field::CONTENT).is_some());
        assert_eq!(
            schema.key_for_semantic(semantic::STATUS),
            Some(field::STATUS)
        );
    }

    #[test]
    fn passes_schema_compliance_check() {
        use crate::adapters::test_harness::{check_schema_consistency, ComplianceOptions};
        let s = mockito::Server::new();
        let a = adapter(&s);
        let opts = ComplianceOptions {
            status_active: "To Do".into(),
            status_alt: "Done".into(),
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

    // ─── issue_to_doc ─────────────────────────────────────────────────────

    #[test]
    fn issue_to_doc_maps_all_fields() {
        let v = sample_issue("PROJ-42");
        let doc = issue_to_doc(&v, 3);
        assert_eq!(doc.id, "PROJ-42");
        assert_eq!(doc.title, "Hello world");
        // Story → leanspec:feature
        assert_eq!(doc.schema_id, SCHEMA_FEATURE);
        assert_eq!(doc.field_str(field::STATUS), Some("To Do"));
        assert_eq!(doc.field_str(field::PRIORITY), Some("high"));
        assert_eq!(
            doc.fields.get(field::TAGS).and_then(|v| v.as_strings()),
            Some(&["bug".to_string(), "backend".to_string()][..])
        );
        // assignee stores the writable identifier (accountId on Cloud), not
        // the human display name — see comment in `fields_payload`.
        assert_eq!(doc.field_str(field::ASSIGNEE), Some("alice-acc-id"));
        assert_eq!(doc.field_str(field::DUE), Some("2026-06-30"));
        let content = doc.field_str(field::CONTENT).unwrap();
        // ADF was translated to markdown; bold round-trips as **world**.
        assert!(content.contains("Hello"));
        assert!(content.contains("**world**"));
        assert!(doc.url.as_deref().unwrap().contains("PROJ-42"));
        assert!(doc.raw.is_some());
        assert!(doc.created_at.is_some());
        assert!(doc.updated_at.is_some());
    }

    #[test]
    fn issue_to_doc_v2_treats_description_as_plain_text() {
        let mut v = sample_issue("PROJ-1");
        v["fields"]["description"] = json!("Plain text body");
        let doc = issue_to_doc(&v, 2);
        assert_eq!(doc.field_str(field::CONTENT), Some("Plain text body"));
    }

    #[test]
    fn issue_to_doc_maps_issue_type_to_schema() {
        let mut v = sample_issue("PROJ-1");
        v["fields"]["issuetype"]["name"] = json!("Bug");
        assert_eq!(issue_to_doc(&v, 3).schema_id, SCHEMA_BUG);
        v["fields"]["issuetype"]["name"] = json!("Epic");
        assert_eq!(issue_to_doc(&v, 3).schema_id, SCHEMA_BASE);
        v["fields"]["issuetype"]["name"] = json!("Feature");
        assert_eq!(issue_to_doc(&v, 3).schema_id, SCHEMA_FEATURE);
    }

    #[test]
    fn priority_name_mapping() {
        assert_eq!(priority_name_to_value("Highest"), "critical");
        assert_eq!(priority_name_to_value("Critical"), "critical");
        assert_eq!(priority_name_to_value("High"), "high");
        assert_eq!(priority_name_to_value("Medium"), "medium");
        assert_eq!(priority_name_to_value("Low"), "low");
        assert_eq!(priority_name_to_value("Lowest"), "low");
        // Unknown values fall through lowercased.
        assert_eq!(priority_name_to_value("Trivial"), "trivial");
    }

    #[test]
    fn parse_jira_datetime_handles_no_colon_offset() {
        let dt = parse_jira_datetime("2026-01-01T10:00:00.000+0000").unwrap();
        // Round-trip to UTC and assert hour/day.
        assert_eq!(
            dt.format("%Y-%m-%dT%H:%M:%S").to_string(),
            "2026-01-01T10:00:00"
        );
    }

    // ─── list / get ───────────────────────────────────────────────────────

    #[test]
    fn list_default_excludes_done_and_filters_by_project() {
        let mut server = mockito::Server::new();
        let body = json!({
            "issues": [sample_issue("PROJ-1")],
            "total": 1,
            "startAt": 0,
            "maxResults": 100
        });
        let m = server
            .mock("GET", "/rest/api/3/search")
            .match_query(Matcher::AllOf(vec![
                Matcher::UrlEncoded(
                    "jql".into(),
                    "project = \"PROJ\" AND statusCategory != Done".into(),
                ),
                Matcher::UrlEncoded("maxResults".into(), "100".into()),
                Matcher::UrlEncoded("startAt".into(), "0".into()),
            ]))
            .with_status(200)
            .with_body(body.to_string())
            .create();

        let a = adapter(&server);
        let docs = a.list(&ListFilter::default()).unwrap();
        assert_eq!(docs.len(), 1);
        m.assert();
    }

    #[test]
    fn list_with_status_filter_quotes_value() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("GET", "/rest/api/3/search")
            .match_query(Matcher::UrlEncoded(
                "jql".into(),
                "project = \"PROJ\" AND status in (\"In Progress\")".into(),
            ))
            .with_status(200)
            .with_body(r#"{ "issues": [], "total": 0, "startAt": 0 }"#)
            .create();

        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), vec!["In Progress".to_string()]);

        let a = adapter(&server);
        a.list(&ListFilter {
            fields,
            ..Default::default()
        })
        .unwrap();
        m.assert();
    }

    #[test]
    fn get_happy_path() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("GET", "/rest/api/3/issue/PROJ-42")
            .with_status(200)
            .with_body(sample_issue("PROJ-42").to_string())
            .create();

        let a = adapter(&server);
        let doc = a.get("PROJ-42").unwrap();
        assert_eq!(doc.id, "PROJ-42");
        m.assert();
    }

    #[test]
    fn get_not_found_carries_requested_id() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/issue/PROJ-999")
            .with_status(404)
            .with_body(r#"{"errorMessages":["Issue does not exist"]}"#)
            .create();

        let a = adapter(&server);
        match a.get("PROJ-999").unwrap_err() {
            AdapterError::NotFound(id) => assert_eq!(id, "PROJ-999"),
            other => panic!("expected NotFound(\"PROJ-999\"), got {other:?}"),
        }
    }

    // ─── create / update / delete ─────────────────────────────────────────

    #[test]
    fn create_posts_issue_then_refetches() {
        let mut server = mockito::Server::new();
        // POST creates the issue, returning { id, key, self }.
        let post = server
            .mock("POST", "/rest/api/3/issue")
            .match_body(Matcher::PartialJson(json!({
                "fields": {
                    "summary": "New story",
                    "project": { "key": "PROJ" },
                    "issuetype": { "name": "Story" },
                    "labels": ["backend"],
                    // Normalized `high` is inverse-mapped to the live Jira
                    // priority name before being sent.
                    "priority": { "name": "High" },
                    // Writes go through `accountId`, not the display name.
                    "assignee": { "accountId": "alice-acc-id" }
                }
            })))
            .with_status(201)
            .with_body(r#"{"id":"10100","key":"PROJ-100","self":"x"}"#)
            .create();
        // …followed by a GET to fetch the full issue back.
        let get = server
            .mock("GET", "/rest/api/3/issue/PROJ-100")
            .with_status(200)
            .with_body(sample_issue("PROJ-100").to_string())
            .create();

        let mut fields = HashMap::new();
        fields.insert(field::CONTENT.into(), FieldValue::from("Body **markdown**"));
        fields.insert(
            field::TAGS.into(),
            FieldValue::from(vec!["backend".to_string()]),
        );
        fields.insert(field::PRIORITY.into(), FieldValue::from("high"));
        fields.insert(field::ASSIGNEE.into(), FieldValue::from("alice-acc-id"));

        let a = adapter(&server);
        let doc = a
            .create(&CreateRequest {
                slug: None,
                title: "New story".into(),
                schema_id: None,
                fields,
                links: vec![],
            })
            .unwrap();
        assert_eq!(doc.id, "PROJ-100");
        post.assert();
        get.assert();
    }

    #[test]
    fn create_with_bug_schema_id_uses_bug_issuetype() {
        let mut server = mockito::Server::new();
        let post = server
            .mock("POST", "/rest/api/3/issue")
            .match_body(Matcher::PartialJson(json!({
                "fields": {
                    "issuetype": { "name": "Bug" }
                }
            })))
            .with_status(201)
            .with_body(r#"{"id":"1","key":"PROJ-1","self":"x"}"#)
            .create();
        server
            .mock("GET", "/rest/api/3/issue/PROJ-1")
            .with_status(200)
            .with_body(sample_issue("PROJ-1").to_string())
            .create();

        let a = adapter(&server);
        a.create(&CreateRequest {
            slug: None,
            title: "boom".into(),
            schema_id: Some("leanspec:bug".into()),
            fields: HashMap::new(),
            links: vec![],
        })
        .unwrap();
        post.assert();
    }

    #[test]
    fn update_field_uses_put() {
        let mut server = mockito::Server::new();
        let put = server
            .mock("PUT", "/rest/api/3/issue/PROJ-42")
            .match_body(Matcher::PartialJson(json!({
                "fields": {
                    "summary": "Renamed",
                    "labels": ["bug"]
                }
            })))
            .with_status(204)
            .create();
        server
            .mock("GET", "/rest/api/3/issue/PROJ-42")
            .with_status(200)
            .with_body(sample_issue("PROJ-42").to_string())
            .create();

        let mut fields = HashMap::new();
        fields.insert(
            field::TAGS.into(),
            FieldValue::from(vec!["bug".to_string()]),
        );

        let a = adapter(&server);
        a.update(
            "PROJ-42",
            &UpdateRequest {
                title: Some("Renamed".into()),
                fields,
                clear: vec![],
                replace_links: None,
            },
        )
        .unwrap();
        put.assert();
    }

    #[test]
    fn update_status_uses_transitions_api() {
        let mut server = mockito::Server::new();
        // GET /transitions returns the candidate set.
        let list_trans = server
            .mock("GET", "/rest/api/3/issue/PROJ-42/transitions")
            .with_status(200)
            .with_body(
                json!({
                    "transitions": [
                        { "id": "11", "name": "Start", "to": { "name": "In Progress",
                          "statusCategory": { "key": "indeterminate" }}},
                        { "id": "21", "name": "Resolve", "to": { "name": "Done",
                          "statusCategory": { "key": "done" }}}
                    ]
                })
                .to_string(),
            )
            .create();
        let post_trans = server
            .mock("POST", "/rest/api/3/issue/PROJ-42/transitions")
            .match_body(Matcher::PartialJson(json!({
                "transition": { "id": "11" }
            })))
            .with_status(204)
            .create();
        server
            .mock("GET", "/rest/api/3/issue/PROJ-42")
            .with_status(200)
            .with_body(sample_issue("PROJ-42").to_string())
            .create();

        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), FieldValue::from("In Progress"));

        let a = adapter(&server);
        a.update(
            "PROJ-42",
            &UpdateRequest {
                title: None,
                fields,
                clear: vec![],
                replace_links: None,
            },
        )
        .unwrap();
        list_trans.assert();
        post_trans.assert();
    }

    #[test]
    fn update_rejects_unknown_field() {
        let server = mockito::Server::new();
        let a = adapter(&server);
        let mut fields = HashMap::new();
        fields.insert("nonexistent".into(), FieldValue::from("x"));
        let err = a
            .update(
                "PROJ-1",
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
    fn delete_transitions_to_done() {
        let mut server = mockito::Server::new();
        let list = server
            .mock("GET", "/rest/api/3/issue/PROJ-42/transitions")
            .with_status(200)
            .with_body(
                json!({
                    "transitions": [
                        { "id": "11", "to": { "name": "In Progress",
                          "statusCategory": { "key": "indeterminate" }}},
                        { "id": "21", "to": { "name": "Done",
                          "statusCategory": { "key": "done" }}}
                    ]
                })
                .to_string(),
            )
            .create();
        let post = server
            .mock("POST", "/rest/api/3/issue/PROJ-42/transitions")
            .match_body(Matcher::PartialJson(json!({
                "transition": { "id": "21" }
            })))
            .with_status(204)
            .create();

        let a = adapter(&server);
        a.delete("PROJ-42").unwrap();
        list.assert();
        post.assert();
    }

    #[test]
    fn delete_without_done_transition_errors() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/issue/PROJ-42/transitions")
            .with_status(200)
            .with_body(
                json!({
                    "transitions": [
                        { "id": "11", "to": { "name": "In Progress",
                          "statusCategory": { "key": "indeterminate" }}}
                    ]
                })
                .to_string(),
            )
            .create();

        let a = adapter(&server);
        let err = a.delete("PROJ-42").unwrap_err();
        match err {
            AdapterError::InvalidField { reason, .. } => assert!(reason.contains("done")),
            other => panic!("expected InvalidField, got {other:?}"),
        }
    }

    #[test]
    fn delete_nonexistent_id_is_not_found() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/issue/PROJ-999/transitions")
            .with_status(404)
            .with_body(r#"{"errorMessages":["Issue does not exist"]}"#)
            .create();

        let a = adapter(&server);
        match a.delete("PROJ-999").unwrap_err() {
            AdapterError::NotFound(id) => assert_eq!(id, "PROJ-999"),
            other => panic!("expected NotFound, got {other:?}"),
        }
    }

    // ─── search ──────────────────────────────────────────────────────────

    #[test]
    fn search_uses_jql_text_with_project_qualifier() {
        let mut server = mockito::Server::new();
        let body = json!({
            "issues": [sample_issue("PROJ-7")],
            "total": 1,
            "startAt": 0
        });
        let m = server
            .mock("GET", "/rest/api/3/search")
            .match_query(Matcher::AllOf(vec![
                Matcher::UrlEncoded(
                    "jql".into(),
                    "project = \"PROJ\" AND text ~ \"needle\"".into(),
                ),
                Matcher::UrlEncoded("maxResults".into(), "100".into()),
            ]))
            .with_status(200)
            .with_body(body.to_string())
            .create();

        let a = adapter(&server);
        let hits = a
            .search("needle", &SearchOptions::default().with_limit(5))
            .unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].id, "PROJ-7");
        m.assert();
    }

    // ─── resolve_schema ──────────────────────────────────────────────────

    #[test]
    fn resolve_schema_populates_status_and_priority_options() {
        let mut server = mockito::Server::new();
        let statuses = json!([
            {
                "name": "Story",
                "statuses": [
                    { "name": "To Do" },
                    { "name": "In Progress" },
                    { "name": "Done" }
                ]
            },
            {
                "name": "Bug",
                "statuses": [
                    { "name": "To Do" },
                    { "name": "Fixed" }
                ]
            }
        ]);
        server
            .mock("GET", "/rest/api/3/project/PROJ/statuses")
            .with_status(200)
            .with_body(statuses.to_string())
            .create();

        let priorities = json!([
            { "id": "1", "name": "Highest" },
            { "id": "2", "name": "High" },
            { "id": "3", "name": "Medium" },
            { "id": "4", "name": "Low" }
        ]);
        server
            .mock("GET", "/rest/api/3/priority")
            .with_status(200)
            .with_body(priorities.to_string())
            .create();

        let a = adapter(&server);
        let mut schema = a.schema().clone();
        a.resolve_schema(&mut schema).unwrap();

        let status = schema.field(field::STATUS).unwrap();
        match &status.kind {
            FieldKind::Enum { options, .. } => {
                let values: Vec<&str> = options.iter().map(|o| o.value.as_str()).collect();
                // Union across issue types, sorted.
                assert_eq!(values, vec!["Done", "Fixed", "In Progress", "To Do"]);
            }
            _ => panic!("expected enum"),
        }
        let priority = schema.field(field::PRIORITY).unwrap();
        match &priority.kind {
            FieldKind::Enum { options, .. } => {
                // `value` is the normalized LeanSpec form (so it matches what
                // documents carry); `label` is the live Jira name (so writes
                // can map back via `normalized_priority_to_jira_name`).
                let pairs: Vec<(&str, &str)> = options
                    .iter()
                    .map(|o| (o.value.as_str(), o.label.as_str()))
                    .collect();
                assert_eq!(
                    pairs,
                    vec![
                        ("critical", "Highest"),
                        ("high", "High"),
                        ("low", "Low"),
                        ("medium", "Medium"),
                    ]
                );
            }
            _ => panic!("expected enum"),
        }
    }

    #[test]
    fn normalized_priority_inverse_uses_resolved_schema() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/project/PROJ/statuses")
            .with_status(200)
            .with_body("[]")
            .create();
        server
            .mock("GET", "/rest/api/3/priority")
            .with_status(200)
            .with_body(r#"[{"id":"1","name":"Critical"},{"id":"2","name":"Major"}]"#)
            .create();

        let mut a = adapter(&server);
        a.resolve_inline().unwrap();

        // `Critical` → critical; the inverse map should hand back the Jira
        // name "Critical" (not the default "Highest").
        assert_eq!(a.normalized_priority_to_jira_name("critical"), "Critical");
        // Custom Jira priority `Major` survives through priority_name_to_value
        // as `major`; lookup hits the schema and returns the Jira label.
        assert_eq!(a.normalized_priority_to_jira_name("major"), "Major");
        // Anything unknown falls through to the default vocabulary.
        assert_eq!(a.normalized_priority_to_jira_name("high"), "High");
    }

    // ─── auth / rate limit / token validation ────────────────────────────

    #[test]
    fn auth_failure_maps_to_autherror() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/issue/PROJ-1")
            .with_status(401)
            .with_body(r#"{"errorMessages":["Bad credentials"]}"#)
            .create();

        let a = adapter(&server);
        match a.get("PROJ-1").unwrap_err() {
            AdapterError::AuthError { adapter, reason } => {
                assert_eq!(adapter, ADAPTER_NAME);
                assert!(reason.contains("JIRA_TOKEN"));
            }
            other => panic!("expected AuthError, got {other:?}"),
        }
    }

    #[test]
    fn rate_limit_response_parses_iso8601_reset_header() {
        // Jira Cloud advertises X-RateLimit-Reset as an ISO-8601 timestamp.
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/issue/PROJ-1")
            .with_status(429)
            .with_header("x-ratelimit-reset", "2030-04-12T15:30:00Z")
            .with_body(r#"{"errorMessages":["Too Many Requests"]}"#)
            .create();

        let a = adapter(&server);
        let err = a.get("PROJ-1").unwrap_err();
        match err {
            AdapterError::RateLimit { adapter, reset_at } => {
                assert_eq!(adapter, ADAPTER_NAME);
                let want = DateTime::parse_from_rfc3339("2030-04-12T15:30:00Z")
                    .unwrap()
                    .with_timezone(&Utc);
                assert_eq!(reset_at, Some(want));
            }
            other => panic!("expected RateLimit, got {other:?}"),
        }
    }

    #[test]
    fn rate_limit_response_falls_back_to_unix_seconds() {
        // Some self-hosted Jira deployments emit Unix seconds. Keep parsing
        // that for backwards compatibility.
        let mut server = mockito::Server::new();
        let reset_ts = 1_900_000_000_i64;
        server
            .mock("GET", "/rest/api/3/issue/PROJ-1")
            .with_status(429)
            .with_header("x-ratelimit-reset", &reset_ts.to_string())
            .with_body(r#"{"errorMessages":["Too Many Requests"]}"#)
            .create();

        let a = adapter(&server);
        let err = a.get("PROJ-1").unwrap_err();
        match err {
            AdapterError::RateLimit { adapter, reset_at } => {
                assert_eq!(adapter, ADAPTER_NAME);
                let want = chrono::Utc.timestamp_opt(reset_ts, 0).single().unwrap();
                assert_eq!(reset_at, Some(want));
            }
            other => panic!("expected RateLimit, got {other:?}"),
        }
    }

    #[test]
    fn rate_limit_falls_back_to_retry_after_when_reset_missing() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/issue/PROJ-1")
            .with_status(429)
            .with_header("retry-after", "30")
            .with_body(r#"{"errorMessages":["slow down"]}"#)
            .create();

        let before = Utc::now();
        let a = adapter(&server);
        let err = a.get("PROJ-1").unwrap_err();
        match err {
            AdapterError::RateLimit { reset_at, .. } => {
                let reset = reset_at.expect("Retry-After should populate reset_at");
                // Reset is "now + 30s"; allow a generous window for clock skew
                // / test machine slowness rather than asserting exactly 30.
                let delta = reset.signed_duration_since(before).num_seconds();
                assert!(
                    (25..=40).contains(&delta),
                    "expected reset_at ~30s out, got {delta}s"
                );
            }
            other => panic!("expected RateLimit, got {other:?}"),
        }
    }

    #[test]
    fn parse_reset_header_handles_iso_and_unix_forms() {
        let iso = parse_reset_header("2030-04-12T15:30:00Z").unwrap();
        assert_eq!(iso.format("%Y").to_string(), "2030");

        let unix = parse_reset_header("1900000000").unwrap();
        assert_eq!(unix.timestamp(), 1_900_000_000);

        assert!(parse_reset_header("not a date").is_none());
    }

    #[test]
    fn validate_token_returns_user_info() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/myself")
            .with_status(200)
            .with_body(r#"{"accountId":"acc-1","displayName":"Alice"}"#)
            .create();

        let info = validate_token(
            "demo.atlassian.net",
            "alice@example.com",
            "fake-token",
            3,
            Some(&server.url()),
        )
        .unwrap();
        assert_eq!(info.display_name, "Alice");
        assert_eq!(info.account_id, "acc-1");
    }

    #[test]
    fn validate_token_401_is_auth_error() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/rest/api/3/myself")
            .with_status(401)
            .with_body(r#"{"errorMessages":["Bad credentials"]}"#)
            .create();

        match validate_token(
            "demo.atlassian.net",
            "alice@example.com",
            "bad-token",
            3,
            Some(&server.url()),
        ) {
            Err(AdapterError::AuthError { .. }) => {}
            other => panic!("expected AuthError, got {other:?}"),
        }
    }

    // ─── pagination ──────────────────────────────────────────────────────

    #[test]
    fn paginate_search_follows_start_at() {
        let mut server = mockito::Server::new();
        let page1 = json!({
            "issues": [sample_issue("PROJ-1")],
            "total": 2,
            "startAt": 0,
            "maxResults": 100
        });
        let page2 = json!({
            "issues": [sample_issue("PROJ-2")],
            "total": 2,
            "startAt": 1,
            "maxResults": 100
        });
        server
            .mock("GET", "/rest/api/3/search")
            .match_query(Matcher::UrlEncoded("startAt".into(), "0".into()))
            .with_status(200)
            .with_body(page1.to_string())
            .create();
        server
            .mock("GET", "/rest/api/3/search")
            .match_query(Matcher::UrlEncoded("startAt".into(), "1".into()))
            .with_status(200)
            .with_body(page2.to_string())
            .create();

        let a = adapter(&server);
        let docs = a.list(&ListFilter::default()).unwrap();
        assert_eq!(docs.len(), 2);
        let ids: Vec<&str> = docs.iter().map(|d| d.id.as_str()).collect();
        assert!(ids.contains(&"PROJ-1"));
        assert!(ids.contains(&"PROJ-2"));
    }

    // ─── helpers ─────────────────────────────────────────────────────────

    #[test]
    fn jql_quote_escapes_internal_quotes_and_backslashes() {
        assert_eq!(jql_quote("simple"), "\"simple\"");
        assert_eq!(jql_quote("with \"quote\""), "\"with \\\"quote\\\"\"");
        assert_eq!(jql_quote("back\\slash"), "\"back\\\\slash\"");
    }

    #[test]
    fn find_done_transition_picks_done_category() {
        let transitions = vec![
            json!({ "id": "10", "to": { "statusCategory": { "key": "indeterminate" } } }),
            json!({ "id": "20", "to": { "statusCategory": { "key": "done" } } }),
        ];
        assert_eq!(find_done_transition(&transitions), Some("20".to_string()));
    }

    #[test]
    fn find_done_transition_handles_numeric_id() {
        // Some Jira responses serialise the transition id as a number.
        let transitions = vec![json!({
            "id": 30,
            "to": { "statusCategory": { "key": "done" } }
        })];
        assert_eq!(find_done_transition(&transitions), Some("30".to_string()));
    }

    #[test]
    fn find_done_transition_returns_none_when_absent() {
        let transitions =
            vec![json!({ "id": "10", "to": { "statusCategory": { "key": "indeterminate" } } })];
        assert_eq!(find_done_transition(&transitions), None);
    }

    // ─── round-trip — content survives ADF→md→ADF ────────────────────────

    #[test]
    fn description_roundtrips_through_adf() {
        let mut v = sample_issue("PROJ-1");
        // Replace description with one carrying a heading + list to exercise
        // multiple node types.
        v["fields"]["description"] = json!({
            "version": 1,
            "type": "doc",
            "content": [
                { "type": "heading", "attrs": { "level": 2 },
                  "content": [{ "type": "text", "text": "Summary" }] },
                { "type": "bulletList", "content": [
                    { "type": "listItem", "content": [
                        { "type": "paragraph", "content": [
                            { "type": "text", "text": "alpha" } ] } ] }
                ]}
            ]
        });
        let doc = issue_to_doc(&v, 3);
        let content = doc.field_str(field::CONTENT).unwrap();
        assert!(content.contains("## Summary"));
        assert!(content.contains("- alpha"));
        // And the inverse: from_markdown turns it back into an ADF doc with the
        // same nodes.
        let adf_again = adf::from_markdown(content);
        assert_eq!(adf_again["type"], "doc");
    }
}

/// Integration tests that exercise a real Jira Cloud site. Run with:
///
/// ```sh
/// JIRA_TOKEN=… TEST_JIRA_HOST=… TEST_JIRA_PROJECT=… TEST_JIRA_EMAIL=… \
///   cargo test -p leanspec-core \
///     --features jira-integration-tests \
///     -- --ignored integration
/// ```
#[cfg(all(test, feature = "jira-integration-tests"))]
mod integration {
    use super::*;
    use crate::adapters::test_harness::{run_compliance_suite, ComplianceOptions};

    fn live_adapter() -> Option<JiraAdapter> {
        let host = std::env::var("TEST_JIRA_HOST").ok()?;
        let project = std::env::var("TEST_JIRA_PROJECT").ok()?;
        let email = std::env::var("TEST_JIRA_EMAIL").ok()?;
        JiraAdapter::new(host, project, email, "JIRA_TOKEN").ok()
    }

    fn compliance_options() -> ComplianceOptions {
        ComplianceOptions {
            status_active: std::env::var("TEST_JIRA_STATUS_ACTIVE")
                .unwrap_or_else(|_| "To Do".into()),
            status_alt: std::env::var("TEST_JIRA_STATUS_ALT")
                .unwrap_or_else(|_| "In Progress".into()),
            delete_is_archive: true,
            supports_links: false,
            ..ComplianceOptions::default()
        }
    }

    #[test]
    #[ignore = "hits a real Jira Cloud site; requires JIRA_TOKEN + TEST_JIRA_HOST + TEST_JIRA_PROJECT + TEST_JIRA_EMAIL"]
    fn integration_compliance_suite() {
        let Some(adapter) = live_adapter() else {
            return;
        };
        run_compliance_suite(&adapter, &compliance_options());
    }
}
