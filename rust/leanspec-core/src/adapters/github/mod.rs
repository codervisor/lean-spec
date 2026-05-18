//! # GitHub Issues adapter
//!
//! [`Adapter`] implementation backed by the GitHub REST API. Each spec
//! corresponds to a GitHub Issue: `SpecDoc::id` is the issue number, `title`
//! and `content` map to the issue title and body, and the metadata fields
//! (`status`, `tags`, `assignee`, `priority`, `due`) are projected from issue
//! state, labels, assignees, and the linked milestone.
//!
//! ## Authentication
//!
//! The token is read from an environment variable at construction time. The
//! variable name is configurable (`token_env`, defaults to `GITHUB_TOKEN`) so
//! that the on-disk `leanspec.adapter.yaml` never contains a secret.
//!
//! ## Schema resolution
//!
//! [`GitHubAdapter::resolve_schema`] fetches the repository's label set via
//! `GET /repos/{owner}/{repo}/labels` and populates the `tags` and `priority`
//! enum options. Labels prefixed with `priority:` (e.g. `priority:high`) feed
//! the `priority` field; all other labels become `tags` options.
//!
//! ## Delete semantics
//!
//! GitHub has no hard-delete for issues. [`GitHubAdapter::delete`] closes the
//! issue (`state: closed`), matching the archive semantics used elsewhere in
//! LeanSpec.

use std::collections::HashMap;
use std::time::Duration;

use chrono::{DateTime, TimeZone, Utc};
use reqwest::blocking::{Client, RequestBuilder, Response};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, LINK, USER_AGENT};
use reqwest::{Method, StatusCode};
use serde_json::{json, Value};

use super::{Adapter, AdapterCapabilities, AdapterError, ListFilter, SearchHit, SearchOptions};
use crate::model::{
    semantic, CreateRequest, EnumOption, FieldDef, FieldDisplay, FieldKind, FieldValue, LinkTypeDef,
    SpecDoc, SpecSchema, UpdateRequest,
};

/// Adapter name used in errors and capabilities.
pub const ADAPTER_NAME: &str = "github";

/// Stable schema id for the GitHub adapter.
pub const SCHEMA_ID: &str = "leanspec:github";

/// Label prefix that marks a label as a priority value.
const PRIORITY_LABEL_PREFIX: &str = "priority:";

/// Default per-page count when listing issues (GitHub max is 100).
const DEFAULT_PAGE_SIZE: u32 = 100;

/// Default upper bound on items returned by `list` when pagination is not
/// capped by the caller.
const DEFAULT_LIST_LIMIT: usize = 1000;

/// Metadata field keys declared by the GitHub adapter schema.
pub mod field {
    pub const STATUS: &str = "status";
    pub const PRIORITY: &str = "priority";
    pub const TAGS: &str = "tags";
    pub const ASSIGNEE: &str = "assignee";
    pub const DUE: &str = "due";
    pub const CONTENT: &str = "content";
}

/// Link type keys declared by the GitHub adapter schema.
pub mod link {
    pub const DEPENDS_ON: &str = "depends_on";
}

fn status_options() -> Vec<EnumOption> {
    vec![
        EnumOption {
            value: "open".into(),
            label: "Open".into(),
            color: Some("#22c55e".into()),
            icon: None,
            description: Some("Issue is open on GitHub".into()),
        },
        EnumOption {
            value: "closed".into(),
            label: "Closed".into(),
            color: Some("#9ca3af".into()),
            icon: None,
            description: Some("Issue is closed on GitHub".into()),
        },
    ]
}

fn build_schema() -> SpecSchema {
    SpecSchema {
        id: SCHEMA_ID.into(),
        name: "GitHub Issue".into(),
        extends: None,
        fields: vec![
            FieldDef {
                key: field::STATUS.into(),
                label: "Status".into(),
                kind: FieldKind::Enum {
                    options: status_options(),
                    multi: false,
                    allow_custom: false,
                    dynamic: false,
                },
                display: FieldDisplay::Inline,
                required: true,
                semantic: Some(semantic::STATUS.to_string()),
                ai_hint: Some("Issue state (open/closed)".into()),
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
                ai_hint: Some("Backed by labels prefixed 'priority:'".into()),
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
                placeholder: Some("@username".into()),
            },
            FieldDef {
                key: field::DUE.into(),
                label: "Due Date".into(),
                kind: FieldKind::Text,
                display: FieldDisplay::Inline,
                required: false,
                semantic: Some(semantic::DUE_DATE.to_string()),
                ai_hint: Some("ISO date from the linked milestone".into()),
                placeholder: Some("YYYY-MM-DD".into()),
            },
            FieldDef {
                key: field::CONTENT.into(),
                label: "Body".into(),
                kind: FieldKind::LongText,
                display: FieldDisplay::Section,
                required: false,
                semantic: None,
                ai_hint: Some("Issue body in markdown".into()),
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
        // GitHub has no hard-delete; `delete` closes the issue.
        supports_delete: true,
        supports_search: true,
        supports_webhooks: false,
        default_schema: SCHEMA_ID.into(),
    }
}

/// Adapter that speaks the GitHub REST API.
pub struct GitHubAdapter {
    owner: String,
    repo: String,
    /// Base URL for the GitHub REST API. Defaults to `https://api.github.com`
    /// but can be overridden for tests against a mock server.
    base_url: String,
    token: String,
    client: Client,
    capabilities: AdapterCapabilities,
    schema: SpecSchema,
}

impl GitHubAdapter {
    /// Construct a new adapter against `owner/repo`. The bearer token is read
    /// from the `token_env` environment variable; the value is never written
    /// to disk by this adapter.
    pub fn new(
        owner: impl Into<String>,
        repo: impl Into<String>,
        token_env: impl AsRef<str>,
    ) -> Result<Self, AdapterError> {
        let env_name = token_env.as_ref();
        let token = std::env::var(env_name).map_err(|_| AdapterError::AuthError {
            adapter: ADAPTER_NAME.into(),
            reason: format!("environment variable '{env_name}' is not set"),
        })?;
        Self::with_token(owner, repo, token, "https://api.github.com")
    }

    /// Internal constructor used by tests so the mock server URL can be
    /// injected and the token supplied directly.
    fn with_token(
        owner: impl Into<String>,
        repo: impl Into<String>,
        token: impl Into<String>,
        base_url: impl Into<String>,
    ) -> Result<Self, AdapterError> {
        let client = Client::builder()
            .user_agent("leanspec-github-adapter")
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| AdapterError::BackendError {
                adapter: ADAPTER_NAME.into(),
                reason: format!("failed to construct HTTP client: {e}"),
            })?;
        Ok(Self {
            owner: owner.into(),
            repo: repo.into(),
            base_url: base_url.into(),
            token: token.into(),
            client,
            capabilities: build_capabilities(),
            schema: build_schema(),
        })
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url.trim_end_matches('/'), path)
    }

    fn issues_path(&self) -> String {
        format!("/repos/{}/{}/issues", self.owner, self.repo)
    }

    fn auth_headers(&self) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", self.token))
                .unwrap_or_else(|_| HeaderValue::from_static("")),
        );
        h.insert(
            ACCEPT,
            HeaderValue::from_static("application/vnd.github+json"),
        );
        h.insert(USER_AGENT, HeaderValue::from_static("leanspec-github-adapter"));
        h.insert("X-GitHub-Api-Version", HeaderValue::from_static("2022-11-28"));
        h
    }

    fn request(&self, method: Method, url: &str) -> RequestBuilder {
        self.client.request(method, url).headers(self.auth_headers())
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

        // Capture body and headers before consuming the response.
        let headers = resp.headers().clone();
        let body = resp.text().unwrap_or_default();
        Err(map_error(status, &headers, &body))
    }

    fn parse_json(resp: Response) -> Result<Value, AdapterError> {
        resp.json().map_err(|e| AdapterError::ParseError {
            path: "github response".into(),
            reason: e.to_string(),
        })
    }

    /// Fetch every page reachable via the `Link: <…>; rel="next"` header,
    /// stopping when `limit` items have been collected.
    fn paginate_issues(&self, url: &str, limit: usize) -> Result<Vec<Value>, AdapterError> {
        let mut out: Vec<Value> = Vec::new();
        let mut next: Option<String> = Some(url.to_string());

        while let Some(u) = next.take() {
            let resp = self.send(self.request(Method::GET, &u))?;
            let link_next = parse_next_link(resp.headers().get(LINK));
            let value: Value = Self::parse_json(resp)?;
            let arr = value.as_array().cloned().unwrap_or_default();
            for item in arr {
                if out.len() >= limit {
                    return Ok(out);
                }
                // `/repos/.../issues` returns both issues and pull requests.
                // Pull requests carry a `pull_request` key — skip them.
                if item.get("pull_request").is_some() {
                    continue;
                }
                out.push(item);
            }
            next = link_next;
        }

        Ok(out)
    }
}

impl Adapter for GitHubAdapter {
    fn capabilities(&self) -> &AdapterCapabilities {
        &self.capabilities
    }

    fn schema(&self) -> &SpecSchema {
        &self.schema
    }

    fn resolve_schema(&self, schema: &mut SpecSchema) -> Result<(), AdapterError> {
        let url = self.url(&format!(
            "/repos/{}/{}/labels?per_page={}",
            self.owner, self.repo, DEFAULT_PAGE_SIZE
        ));
        let mut tag_options: Vec<EnumOption> = Vec::new();
        let mut priority_options: Vec<EnumOption> = Vec::new();
        let mut next = Some(url);

        while let Some(u) = next.take() {
            let resp = self.send(self.request(Method::GET, &u))?;
            let link_next = parse_next_link(resp.headers().get(LINK));
            let value: Value = Self::parse_json(resp)?;
            for item in value.as_array().cloned().unwrap_or_default() {
                let Some(name) = item.get("name").and_then(|v| v.as_str()) else {
                    continue;
                };
                let color = item
                    .get("color")
                    .and_then(|v| v.as_str())
                    .map(|c| format!("#{c}"));
                let description = item
                    .get("description")
                    .and_then(|v| v.as_str())
                    .map(String::from);

                if let Some(rest) = name.strip_prefix(PRIORITY_LABEL_PREFIX) {
                    priority_options.push(EnumOption {
                        value: rest.to_string(),
                        label: rest.to_string(),
                        color: color.clone(),
                        icon: None,
                        description: description.clone(),
                    });
                } else {
                    tag_options.push(EnumOption {
                        value: name.to_string(),
                        label: name.to_string(),
                        color: color.clone(),
                        icon: None,
                        description: description.clone(),
                    });
                }
            }
            next = link_next;
        }

        for f in schema.fields.iter_mut() {
            if let FieldKind::Enum { options, .. } = &mut f.kind {
                if f.key == field::TAGS {
                    *options = tag_options.clone();
                } else if f.key == field::PRIORITY {
                    *options = priority_options.clone();
                }
            }
        }

        Ok(())
    }

    fn list(&self, filter: &ListFilter) -> Result<Vec<SpecDoc>, AdapterError> {
        let mut req = self.request(Method::GET, &self.url(&self.issues_path()));

        let mut query: Vec<(String, String)> = Vec::new();
        query.push(("per_page".into(), DEFAULT_PAGE_SIZE.to_string()));

        // Status filter (open/closed/all).
        let state = filter
            .fields
            .get(field::STATUS)
            .and_then(|v| v.first())
            .cloned()
            .unwrap_or_else(|| {
                if filter.include_archived {
                    "all".into()
                } else {
                    "open".into()
                }
            });
        query.push(("state".into(), state));

        if let Some(labels) = filter.fields.get(field::TAGS) {
            if !labels.is_empty() {
                query.push(("labels".into(), labels.join(",")));
            }
        }
        if let Some(assignees) = filter.fields.get(field::ASSIGNEE) {
            if let Some(first) = assignees.first() {
                query.push(("assignee".into(), first.clone()));
            }
        }

        req = req.query(&query);
        let url = req
            .try_clone()
            .and_then(|r| r.build().ok())
            .map(|r| r.url().to_string())
            .unwrap_or_else(|| self.url(&self.issues_path()));

        let issues = self.paginate_issues(&url, DEFAULT_LIST_LIMIT)?;
        let mut docs: Vec<SpecDoc> = issues.iter().map(issue_to_doc).collect();

        // Free-text filter is applied client-side; GitHub's `q=` lives behind
        // a different endpoint (`/search/issues`) which `search()` uses.
        if let Some(ref text) = filter.text {
            let needle = text.to_lowercase();
            docs.retain(|d| {
                d.title.to_lowercase().contains(&needle)
                    || d.id.to_lowercase().contains(&needle)
                    || d.fields
                        .get(field::CONTENT)
                        .and_then(|v| v.as_str())
                        .map(|c| c.to_lowercase().contains(&needle))
                        .unwrap_or(false)
            });
        }

        Ok(docs)
    }

    fn get(&self, id: &str) -> Result<SpecDoc, AdapterError> {
        let url = self.url(&format!("{}/{}", self.issues_path(), id));
        let resp = self.send(self.request(Method::GET, &url))?;
        let value = Self::parse_json(resp)?;
        Ok(issue_to_doc(&value))
    }

    fn create(&self, req: &CreateRequest) -> Result<SpecDoc, AdapterError> {
        if let Some(ref id) = req.schema_id {
            if id != SCHEMA_ID {
                return Err(AdapterError::ConfigError(format!(
                    "github adapter only supports schema '{}', got '{}'",
                    SCHEMA_ID, id,
                )));
            }
        }

        let mut body = serde_json::Map::new();
        body.insert("title".into(), Value::String(req.title.clone()));
        if let Some(content) = req.fields.get(field::CONTENT).and_then(|v| v.as_str()) {
            body.insert("body".into(), Value::String(content.into()));
        }

        let mut labels = req
            .fields
            .get(field::TAGS)
            .and_then(|v| v.as_strings())
            .map(|s| s.to_vec())
            .unwrap_or_default();
        if let Some(priority) = req.fields.get(field::PRIORITY).and_then(|v| v.as_str()) {
            labels.push(format!("{PRIORITY_LABEL_PREFIX}{priority}"));
        }
        if !labels.is_empty() {
            body.insert(
                "labels".into(),
                Value::Array(labels.into_iter().map(Value::String).collect()),
            );
        }

        if let Some(assignee) = req.fields.get(field::ASSIGNEE).and_then(|v| v.as_str()) {
            body.insert(
                "assignees".into(),
                Value::Array(vec![Value::String(assignee.into())]),
            );
        }

        let url = self.url(&self.issues_path());
        let resp = self.send(
            self.request(Method::POST, &url)
                .json(&Value::Object(body)),
        )?;
        let value = Self::parse_json(resp)?;
        Ok(issue_to_doc(&value))
    }

    fn update(&self, id: &str, req: &UpdateRequest) -> Result<SpecDoc, AdapterError> {
        reject_unknown_fields(&req.fields, &self.schema)?;

        let mut body = serde_json::Map::new();
        if let Some(ref title) = req.title {
            body.insert("title".into(), Value::String(title.clone()));
        }
        if let Some(content) = req.fields.get(field::CONTENT).and_then(|v| v.as_str()) {
            body.insert("body".into(), Value::String(content.into()));
        }
        if let Some(status) = req.fields.get(field::STATUS).and_then(|v| v.as_str()) {
            match status {
                "open" | "closed" => {
                    body.insert("state".into(), Value::String(status.into()));
                }
                other => {
                    return Err(AdapterError::InvalidField {
                        adapter: ADAPTER_NAME.into(),
                        reason: format!("status must be 'open' or 'closed', got '{other}'"),
                    });
                }
            }
        }
        if let Some(assignee) = req.fields.get(field::ASSIGNEE).and_then(|v| v.as_str()) {
            body.insert(
                "assignees".into(),
                Value::Array(vec![Value::String(assignee.into())]),
            );
        }

        // Labels/priority: when either is set, replace the full label set
        // GitHub-side using the union of `tags` + the optional priority label.
        let touches_tags = req.fields.contains_key(field::TAGS);
        let touches_priority = req.fields.contains_key(field::PRIORITY);
        if touches_tags || touches_priority {
            let mut labels = req
                .fields
                .get(field::TAGS)
                .and_then(|v| v.as_strings())
                .map(|s| s.to_vec())
                .unwrap_or_default();
            if let Some(priority) = req.fields.get(field::PRIORITY).and_then(|v| v.as_str()) {
                labels.push(format!("{PRIORITY_LABEL_PREFIX}{priority}"));
            }
            body.insert(
                "labels".into(),
                Value::Array(labels.into_iter().map(Value::String).collect()),
            );
        }

        // Explicit clears.
        for key in &req.clear {
            match key.as_str() {
                field::ASSIGNEE => {
                    body.insert("assignees".into(), Value::Array(vec![]));
                }
                field::TAGS | field::PRIORITY => {
                    body.insert("labels".into(), Value::Array(vec![]));
                }
                _ => {}
            }
        }

        let url = self.url(&format!("{}/{}", self.issues_path(), id));
        let resp = self.send(
            self.request(Method::PATCH, &url)
                .json(&Value::Object(body)),
        )?;
        let value = Self::parse_json(resp)?;
        Ok(issue_to_doc(&value))
    }

    fn delete(&self, id: &str) -> Result<(), AdapterError> {
        // GitHub has no hard-delete for issues; closing matches the "archive"
        // semantics used elsewhere.
        let url = self.url(&format!("{}/{}", self.issues_path(), id));
        let body = json!({ "state": "closed" });
        self.send(self.request(Method::PATCH, &url).json(&body))?;
        Ok(())
    }

    fn search(&self, query: &str, opts: &SearchOptions) -> Result<Vec<SearchHit>, AdapterError> {
        // GitHub's search endpoint requires repo qualifier in the query.
        let q = format!("{query} repo:{}/{}", self.owner, self.repo);
        let per_page = opts.limit.unwrap_or(30).min(100) as u32;
        let url = self.url("/search/issues");

        let resp = self.send(
            self.request(Method::GET, &url)
                .query(&[("q", q.as_str()), ("per_page", &per_page.to_string())]),
        )?;
        let value = Self::parse_json(resp)?;
        let items = value
            .get("items")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let hits = items
            .iter()
            .filter(|item| item.get("pull_request").is_none())
            .map(|item| {
                let id = item
                    .get("number")
                    .and_then(|v| v.as_i64())
                    .map(|n| n.to_string())
                    .unwrap_or_default();
                let score = item
                    .get("score")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0) as f32;
                let snippet = if opts.include_body {
                    item.get("body")
                        .and_then(|v| v.as_str())
                        .map(|s| s.chars().take(200).collect())
                } else {
                    None
                };
                SearchHit { id, score, snippet }
            })
            .collect();
        Ok(hits)
    }
}

/// Project a GitHub issue JSON payload onto a [`SpecDoc`].
pub(crate) fn issue_to_doc(issue: &Value) -> SpecDoc {
    let number = issue
        .get("number")
        .and_then(|v| v.as_i64())
        .map(|n| n.to_string())
        .unwrap_or_default();
    let title = issue
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let state = issue
        .get("state")
        .and_then(|v| v.as_str())
        .unwrap_or("open")
        .to_string();

    let mut fields: HashMap<String, FieldValue> = HashMap::new();
    fields.insert(field::STATUS.into(), FieldValue::String(state));

    let labels: Vec<String> = issue
        .get("labels")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|l| {
                    // Label entries can be either a bare string (rare, legacy)
                    // or an object with `name`. Handle both.
                    l.as_str()
                        .map(String::from)
                        .or_else(|| l.get("name").and_then(|n| n.as_str()).map(String::from))
                })
                .collect()
        })
        .unwrap_or_default();

    let mut tags: Vec<String> = Vec::new();
    let mut priority: Option<String> = None;
    for label in labels {
        if let Some(rest) = label.strip_prefix(PRIORITY_LABEL_PREFIX) {
            priority = Some(rest.to_string());
        } else {
            tags.push(label);
        }
    }
    if !tags.is_empty() {
        fields.insert(field::TAGS.into(), FieldValue::Strings(tags));
    }
    if let Some(p) = priority {
        fields.insert(field::PRIORITY.into(), FieldValue::String(p));
    }

    if let Some(assignee) = issue
        .get("assignees")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.first())
        .and_then(|a| a.get("login"))
        .and_then(|v| v.as_str())
    {
        fields.insert(
            field::ASSIGNEE.into(),
            FieldValue::String(assignee.to_string()),
        );
    }

    if let Some(due) = issue
        .get("milestone")
        .and_then(|m| m.get("due_on"))
        .and_then(|v| v.as_str())
    {
        // GitHub returns full RFC3339; trim to YYYY-MM-DD for the field.
        let date = due.split('T').next().unwrap_or(due).to_string();
        fields.insert(field::DUE.into(), FieldValue::String(date));
    }

    if let Some(body) = issue.get("body").and_then(|v| v.as_str()) {
        if !body.is_empty() {
            fields.insert(field::CONTENT.into(), FieldValue::String(body.to_string()));
        }
    }

    let created_at = issue
        .get("created_at")
        .and_then(|v| v.as_str())
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&Utc));
    let updated_at = issue
        .get("updated_at")
        .and_then(|v| v.as_str())
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&Utc));
    let url = issue
        .get("html_url")
        .and_then(|v| v.as_str())
        .map(String::from);

    SpecDoc {
        id: number,
        title,
        schema_id: SCHEMA_ID.into(),
        fields,
        links: Vec::new(),
        created_at,
        updated_at,
        url,
        raw: Some(issue.clone()),
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
            reason: "GITHUB_TOKEN is invalid or missing".into(),
        },
        403 | 429 => {
            // Rate limited iff the remaining header reads 0 or 403 explicitly
            // carries a `X-RateLimit-Reset` header. Otherwise treat as a
            // generic auth/forbidden error.
            let remaining = headers
                .get("x-ratelimit-remaining")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.parse::<u32>().ok());
            let reset = headers
                .get("x-ratelimit-reset")
                .and_then(|h| h.to_str().ok())
                .and_then(|s| s.parse::<i64>().ok())
                .and_then(|ts| Utc.timestamp_opt(ts, 0).single());

            if status.as_u16() == 429 || remaining == Some(0) || reset.is_some() {
                AdapterError::RateLimit {
                    adapter: ADAPTER_NAME.into(),
                    reset_at: reset,
                }
            } else {
                AdapterError::AuthError {
                    adapter: ADAPTER_NAME.into(),
                    reason: format!("forbidden: {body}"),
                }
            }
        }
        404 => AdapterError::NotFound(extract_id_from_body(body).unwrap_or_else(|| body.into())),
        422 => AdapterError::InvalidField {
            adapter: ADAPTER_NAME.into(),
            reason: body.to_string(),
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

fn extract_id_from_body(body: &str) -> Option<String> {
    serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(String::from))
}

/// Parse the next-page URL out of an HTTP `Link` header.
///
/// GitHub returns entries like
/// `<https://api.github.com/…?page=2>; rel="next", <…>; rel="last"`.
fn parse_next_link(header: Option<&HeaderValue>) -> Option<String> {
    let value = header?.to_str().ok()?;
    for part in value.split(',') {
        let part = part.trim();
        if let Some(close) = part.find('>') {
            if part.starts_with('<') {
                let url = &part[1..close];
                let rest = &part[close + 1..];
                if rest.contains("rel=\"next\"") {
                    return Some(url.to_string());
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::Matcher;
    use serde_json::json;

    fn adapter(server: &mockito::ServerGuard) -> GitHubAdapter {
        GitHubAdapter::with_token("octo", "demo", "test-token", server.url()).unwrap()
    }

    fn sample_issue(number: u64) -> Value {
        json!({
            "number": number,
            "title": "Hello world",
            "state": "open",
            "body": "Body **markdown**",
            "html_url": format!("https://github.com/octo/demo/issues/{number}"),
            "created_at": "2026-01-01T10:00:00Z",
            "updated_at": "2026-01-02T11:00:00Z",
            "labels": [
                { "name": "bug", "color": "ff0000", "description": "Something is broken" },
                { "name": "priority:high", "color": "ffaa00", "description": null }
            ],
            "assignees": [{ "login": "alice" }],
            "milestone": { "due_on": "2026-06-30T23:59:59Z" }
        })
    }

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
        assert_eq!(
            schema.key_for_semantic(semantic::STATUS),
            Some(field::STATUS)
        );
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
    fn issue_to_doc_maps_all_fields() {
        let v = sample_issue(42);
        let doc = issue_to_doc(&v);
        assert_eq!(doc.id, "42");
        assert_eq!(doc.title, "Hello world");
        assert_eq!(doc.schema_id, SCHEMA_ID);
        assert_eq!(doc.field_str(field::STATUS), Some("open"));
        assert_eq!(doc.field_str(field::PRIORITY), Some("high"));
        assert_eq!(
            doc.fields.get(field::TAGS).and_then(|v| v.as_strings()),
            Some(&["bug".to_string()][..])
        );
        assert_eq!(doc.field_str(field::ASSIGNEE), Some("alice"));
        assert_eq!(doc.field_str(field::DUE), Some("2026-06-30"));
        assert_eq!(doc.field_str(field::CONTENT), Some("Body **markdown**"));
        assert!(doc.url.as_deref().unwrap().contains("/issues/42"));
        assert!(doc.raw.is_some());
        assert!(doc.created_at.is_some());
        assert!(doc.updated_at.is_some());
    }

    #[test]
    fn list_filters_by_state_and_labels() {
        let mut server = mockito::Server::new();
        let issues = json!([sample_issue(1), sample_issue(2)]);
        let m = server
            .mock("GET", "/repos/octo/demo/issues")
            .match_query(Matcher::AllOf(vec![
                Matcher::UrlEncoded("state".into(), "closed".into()),
                Matcher::UrlEncoded("labels".into(), "bug,backend".into()),
                Matcher::UrlEncoded("per_page".into(), "100".into()),
            ]))
            .match_header("authorization", "Bearer test-token")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(issues.to_string())
            .create();

        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), vec!["closed".to_string()]);
        fields.insert(
            field::TAGS.into(),
            vec!["bug".to_string(), "backend".to_string()],
        );

        let a = adapter(&server);
        let docs = a
            .list(&ListFilter {
                fields,
                ..Default::default()
            })
            .unwrap();
        assert_eq!(docs.len(), 2);
        m.assert();
    }

    #[test]
    fn list_default_state_is_open() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("GET", "/repos/octo/demo/issues")
            .match_query(Matcher::UrlEncoded("state".into(), "open".into()))
            .with_status(200)
            .with_body("[]")
            .create();

        let a = adapter(&server);
        let docs = a.list(&ListFilter::default()).unwrap();
        assert!(docs.is_empty());
        m.assert();
    }

    #[test]
    fn list_skips_pull_requests() {
        let mut server = mockito::Server::new();
        let mut pr = sample_issue(7);
        pr["pull_request"] = json!({ "url": "x" });
        let issues = json!([sample_issue(1), pr]);
        server
            .mock("GET", "/repos/octo/demo/issues")
            .match_query(Matcher::AnyOf(vec![Matcher::Any]))
            .with_status(200)
            .with_body(issues.to_string())
            .create();

        let a = adapter(&server);
        let docs = a.list(&ListFilter::default()).unwrap();
        assert_eq!(docs.len(), 1);
        assert_eq!(docs[0].id, "1");
    }

    #[test]
    fn get_happy_path() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("GET", "/repos/octo/demo/issues/123")
            .with_status(200)
            .with_body(sample_issue(123).to_string())
            .create();

        let a = adapter(&server);
        let doc = a.get("123").unwrap();
        assert_eq!(doc.id, "123");
        m.assert();
    }

    #[test]
    fn get_not_found_maps_to_notfound() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/repos/octo/demo/issues/999")
            .with_status(404)
            .with_body(r#"{"message":"Not Found"}"#)
            .create();

        let a = adapter(&server);
        let err = a.get("999").unwrap_err();
        assert!(matches!(err, AdapterError::NotFound(_)), "{err:?}");
    }

    #[test]
    fn create_posts_expected_body() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("POST", "/repos/octo/demo/issues")
            .match_body(Matcher::PartialJson(json!({
                "title": "New issue",
                "body": "Hello there",
                "labels": ["bug", "priority:high"],
                "assignees": ["alice"]
            })))
            .with_status(201)
            .with_body(sample_issue(1).to_string())
            .create();

        let mut fields = HashMap::new();
        fields.insert(field::CONTENT.into(), FieldValue::from("Hello there"));
        fields.insert(
            field::TAGS.into(),
            FieldValue::from(vec!["bug".to_string()]),
        );
        fields.insert(field::PRIORITY.into(), FieldValue::from("high"));
        fields.insert(field::ASSIGNEE.into(), FieldValue::from("alice"));

        let a = adapter(&server);
        let doc = a
            .create(&CreateRequest {
                slug: None,
                title: "New issue".into(),
                schema_id: None,
                fields,
                links: vec![],
            })
            .unwrap();
        assert_eq!(doc.id, "1");
        m.assert();
    }

    #[test]
    fn update_patches_only_present_fields() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("PATCH", "/repos/octo/demo/issues/42")
            .match_body(Matcher::PartialJson(json!({
                "title": "Renamed",
                "state": "closed"
            })))
            .with_status(200)
            .with_body(sample_issue(42).to_string())
            .create();

        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), FieldValue::from("closed"));

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
    fn update_rejects_invalid_status_value() {
        let server = mockito::Server::new();
        let a = adapter(&server);
        let mut fields = HashMap::new();
        fields.insert(field::STATUS.into(), FieldValue::from("frobnicated"));
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
    fn delete_closes_issue() {
        let mut server = mockito::Server::new();
        let m = server
            .mock("PATCH", "/repos/octo/demo/issues/42")
            .match_body(Matcher::PartialJson(json!({ "state": "closed" })))
            .with_status(200)
            .with_body(sample_issue(42).to_string())
            .create();

        let a = adapter(&server);
        a.delete("42").unwrap();
        m.assert();
    }

    #[test]
    fn search_hits_search_endpoint_with_repo_qualifier() {
        let mut server = mockito::Server::new();
        let body = json!({
            "items": [{
                "number": 7,
                "title": "Found",
                "state": "open",
                "score": 1.23,
                "body": "some content"
            }]
        });
        let m = server
            .mock("GET", "/search/issues")
            .match_query(Matcher::AllOf(vec![
                Matcher::UrlEncoded("q".into(), "needle repo:octo/demo".into()),
                Matcher::UrlEncoded("per_page".into(), "5".into()),
            ]))
            .with_status(200)
            .with_body(body.to_string())
            .create();

        let a = adapter(&server);
        let hits = a
            .search("needle", &SearchOptions::default().with_limit(5))
            .unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].id, "7");
        m.assert();
    }

    #[test]
    fn resolve_schema_populates_label_options() {
        let mut server = mockito::Server::new();
        let labels = json!([
            { "name": "bug", "color": "ff0000", "description": null },
            { "name": "priority:high", "color": "ffaa00", "description": null },
            { "name": "priority:low", "color": "00ff00", "description": null },
            { "name": "frontend", "color": "0000ff", "description": null }
        ]);
        server
            .mock("GET", "/repos/octo/demo/labels")
            .match_query(Matcher::UrlEncoded("per_page".into(), "100".into()))
            .with_status(200)
            .with_body(labels.to_string())
            .create();

        let a = adapter(&server);
        let mut schema = a.schema().clone();
        a.resolve_schema(&mut schema).unwrap();

        let tags = schema.field(field::TAGS).unwrap();
        let pr = schema.field(field::PRIORITY).unwrap();
        match &tags.kind {
            FieldKind::Enum { options, .. } => {
                let values: Vec<&str> = options.iter().map(|o| o.value.as_str()).collect();
                assert!(values.contains(&"bug"));
                assert!(values.contains(&"frontend"));
                assert!(!values.contains(&"priority:high"));
            }
            _ => panic!("expected enum"),
        }
        match &pr.kind {
            FieldKind::Enum { options, .. } => {
                let values: Vec<&str> = options.iter().map(|o| o.value.as_str()).collect();
                assert_eq!(values, vec!["high", "low"]);
            }
            _ => panic!("expected enum"),
        }
    }

    #[test]
    fn rate_limit_response_yields_ratelimit_error() {
        let mut server = mockito::Server::new();
        // GitHub uses Unix epoch seconds in X-RateLimit-Reset.
        let reset_ts = 1_900_000_000_i64;
        server
            .mock("GET", "/repos/octo/demo/issues/1")
            .with_status(403)
            .with_header("x-ratelimit-remaining", "0")
            .with_header("x-ratelimit-reset", &reset_ts.to_string())
            .with_body(r#"{"message":"API rate limit exceeded"}"#)
            .create();

        let a = adapter(&server);
        let err = a.get("1").unwrap_err();
        match err {
            AdapterError::RateLimit { adapter, reset_at } => {
                assert_eq!(adapter, ADAPTER_NAME);
                let want = Utc.timestamp_opt(reset_ts, 0).single().unwrap();
                assert_eq!(reset_at, Some(want));
            }
            other => panic!("expected RateLimit, got {other:?}"),
        }
    }

    #[test]
    fn auth_failure_maps_to_autherror() {
        let mut server = mockito::Server::new();
        server
            .mock("GET", "/repos/octo/demo/issues/1")
            .with_status(401)
            .with_body(r#"{"message":"Bad credentials"}"#)
            .create();

        let a = adapter(&server);
        match a.get("1").unwrap_err() {
            AdapterError::AuthError { adapter, reason } => {
                assert_eq!(adapter, ADAPTER_NAME);
                assert!(reason.contains("GITHUB_TOKEN"));
            }
            other => panic!("expected AuthError, got {other:?}"),
        }
    }

    #[test]
    fn validation_error_maps_to_invalidfield() {
        let mut server = mockito::Server::new();
        server
            .mock("POST", "/repos/octo/demo/issues")
            .with_status(422)
            .with_body(r#"{"message":"Validation Failed"}"#)
            .create();

        let a = adapter(&server);
        let err = a
            .create(&CreateRequest {
                slug: None,
                title: "x".into(),
                schema_id: None,
                fields: HashMap::new(),
                links: vec![],
            })
            .unwrap_err();
        assert!(matches!(err, AdapterError::InvalidField { .. }), "{err:?}");
    }

    #[test]
    fn pagination_follows_next_link() {
        let mut server = mockito::Server::new();
        let page1_url = format!("{}/repos/octo/demo/issues", server.url());
        let page2_link = format!("<{}?page=2>; rel=\"next\"", page1_url);

        let page1 = json!([sample_issue(1)]);
        let page2 = json!([sample_issue(2)]);

        server
            .mock("GET", "/repos/octo/demo/issues")
            .match_query(Matcher::AllOf(vec![
                Matcher::UrlEncoded("state".into(), "open".into()),
                Matcher::UrlEncoded("per_page".into(), "100".into()),
            ]))
            .with_status(200)
            .with_header("link", &page2_link)
            .with_body(page1.to_string())
            .create();

        server
            .mock("GET", "/repos/octo/demo/issues")
            .match_query(Matcher::UrlEncoded("page".into(), "2".into()))
            .with_status(200)
            .with_body(page2.to_string())
            .create();

        let a = adapter(&server);
        let docs = a.list(&ListFilter::default()).unwrap();
        assert_eq!(docs.len(), 2);
        let ids: Vec<&str> = docs.iter().map(|d| d.id.as_str()).collect();
        assert!(ids.contains(&"1"));
        assert!(ids.contains(&"2"));
    }

    #[test]
    fn parse_next_link_picks_only_next() {
        let v = HeaderValue::from_static(
            "<https://api.example.com/x?page=2>; rel=\"next\", <https://api.example.com/x?page=9>; rel=\"last\"",
        );
        assert_eq!(
            parse_next_link(Some(&v)).as_deref(),
            Some("https://api.example.com/x?page=2"),
        );
        let only_last = HeaderValue::from_static(
            "<https://api.example.com/x?page=9>; rel=\"last\"",
        );
        assert_eq!(parse_next_link(Some(&only_last)), None);
        assert_eq!(parse_next_link(None), None);
    }
}

/// Integration tests that exercise the real GitHub API.
///
/// Guarded by both the `github-integration-tests` feature flag and `#[ignore]`
/// so they never run in CI without explicit opt-in. Run locally with:
///
/// ```sh
/// GITHUB_TOKEN=… TEST_GITHUB_OWNER=… TEST_GITHUB_REPO=… \
///   cargo test -p leanspec-core \
///     --features github-integration-tests \
///     -- --ignored integration
/// ```
#[cfg(all(test, feature = "github-integration-tests"))]
mod integration {
    use super::*;

    fn live_adapter() -> Option<GitHubAdapter> {
        let owner = std::env::var("TEST_GITHUB_OWNER").ok()?;
        let repo = std::env::var("TEST_GITHUB_REPO").ok()?;
        GitHubAdapter::new(owner, repo, "GITHUB_TOKEN").ok()
    }

    #[test]
    #[ignore = "hits real GitHub API; requires GITHUB_TOKEN + TEST_GITHUB_OWNER + TEST_GITHUB_REPO"]
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

        let after = a.get(&id).expect("get after close");
        assert_eq!(after.field_str(field::STATUS), Some("closed"));
    }
}
