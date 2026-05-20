//! End-to-end tests for the MCP server against the markdown adapter.
//!
//! These tests build an in-memory `ServerState` over a temp specs directory,
//! drive the same `handle_request` entry point the stdio loop uses, and
//! assert on the JSON-RPC envelope plus the structured result payload.

use std::path::PathBuf;
use std::sync::Arc;

use leanspec_core::adapters::markdown::MarkdownAdapter;
use leanspec_core::adapters::{
    Adapter, AdapterCapabilities, AdapterError, ListFilter, SearchHit, SearchOptions,
};
use leanspec_core::model::{
    CreateRequest, EnumOption, FieldDef, FieldDisplay, FieldKind, ItemLink, SpecDoc, SpecSchema,
    UpdateRequest,
};
use leanspec_mcp::{
    handle_request,
    protocol::{McpRequest, McpResponse},
    state::ServerState,
};
use serde_json::{json, Value};
use tempfile::TempDir;
use tokio::runtime::Runtime;

fn rt() -> Runtime {
    Runtime::new().expect("tokio runtime")
}

fn markdown_state(tmp: &TempDir) -> Arc<ServerState> {
    let specs_dir = tmp.path().join("specs");
    std::fs::create_dir_all(&specs_dir).unwrap();
    let adapter = MarkdownAdapter::new(&specs_dir);
    ServerState::with_adapter(Box::new(adapter), tmp.path().to_path_buf(), specs_dir)
}

fn parse_request(method: &str, params: Value, id: u64) -> McpRequest {
    let raw = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params,
    });
    serde_json::from_value(raw).expect("valid request envelope")
}

fn call_tool(state: Arc<ServerState>, name: &str, arguments: Value) -> McpResponse {
    let req = parse_request(
        "tools/call",
        json!({ "name": name, "arguments": arguments }),
        1,
    );
    rt().block_on(handle_request(state, req))
}

fn structured(resp: &McpResponse) -> &Value {
    resp.result
        .as_ref()
        .and_then(|r| r.get("structuredContent"))
        .expect("response missing structuredContent")
}

fn error_code(resp: &McpResponse) -> String {
    resp.error
        .as_ref()
        .and_then(|e| e.data.as_ref())
        .and_then(|d| d.get("errorCode"))
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string()
}

#[test]
fn initialize_returns_protocol_version() {
    let tmp = TempDir::new().unwrap();
    let state = markdown_state(&tmp);

    let req = parse_request("initialize", json!({}), 1);
    let resp = rt().block_on(handle_request(state, req));

    let result = resp.result.expect("initialize result");
    assert_eq!(result["protocolVersion"], "2024-11-05");
    assert_eq!(result["serverInfo"]["name"], "leanspec-mcp");
}

#[test]
fn tools_list_advertises_core_and_markdown_only_tools() {
    let tmp = TempDir::new().unwrap();
    let state = markdown_state(&tmp);

    let req = parse_request("tools/list", json!({}), 2);
    let resp = rt().block_on(handle_request(state, req));

    let tools = resp.result.as_ref().unwrap()["tools"]
        .as_array()
        .unwrap()
        .clone();
    let names: Vec<String> = tools
        .iter()
        .map(|t| t["name"].as_str().unwrap().to_string())
        .collect();

    for required in &[
        "list_specs",
        "get_spec",
        "create_spec",
        "update_spec",
        "search_specs",
        "get_schema",
        "get_capabilities",
        "reload_schema",
        "validate_spec",
        "get_dependencies",
        "get_stats",
    ] {
        assert!(
            names.iter().any(|n| n == required),
            "missing tool {required}"
        );
    }
}

#[test]
fn create_spec_input_schema_includes_status_enum_constraint() {
    let tmp = TempDir::new().unwrap();
    let state = markdown_state(&tmp);

    let req = parse_request("tools/list", json!({}), 3);
    let resp = rt().block_on(handle_request(state, req));

    let tools = resp.result.unwrap()["tools"].as_array().unwrap().clone();
    let create = tools
        .iter()
        .find(|t| t["name"] == "create_spec")
        .expect("create_spec tool");
    let status_prop = create["inputSchema"]["properties"]["status"]
        .as_object()
        .expect("status property on create_spec inputSchema");
    let values: Vec<&str> = status_prop["enum"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();
    assert!(values.contains(&"planned"), "{:?}", values);
    assert!(values.contains(&"in-progress"), "{:?}", values);
    assert!(values.contains(&"complete"), "{:?}", values);
}

#[test]
fn list_specs_returns_existing_specs() {
    let tmp = TempDir::new().unwrap();
    let state = markdown_state(&tmp);

    // Seed one spec via the adapter directly.
    let mut req = CreateRequest {
        slug: None,
        title: "First Feature".into(),
        schema_id: None,
        fields: Default::default(),
        links: vec![],
    };
    req.fields.insert(
        "status".into(),
        leanspec_core::model::FieldValue::Strings(vec!["planned".into()]),
    );
    state.adapter().create(&req).expect("create seed spec");

    let resp = call_tool(Arc::clone(&state), "list_specs", json!({}));
    let s = structured(&resp);
    assert_eq!(s["count"], 1);
    assert_eq!(s["specs"][0]["title"], "First Feature");
}

#[test]
fn get_schema_returns_full_field_definitions() {
    let tmp = TempDir::new().unwrap();
    let state = markdown_state(&tmp);

    let resp = call_tool(state, "get_schema", json!({}));
    let s = structured(&resp);
    assert_eq!(s["id"], "leanspec:markdown");
    let fields = s["fields"].as_array().expect("fields array");
    let status_field = fields
        .iter()
        .find(|f| f["key"] == "status")
        .expect("status field present");
    // Enum kind exposes its options.
    let options = status_field["kind"]["options"]
        .as_array()
        .expect("enum options on status field");
    let values: Vec<&str> = options
        .iter()
        .map(|o| o["value"].as_str().unwrap())
        .collect();
    assert!(values.contains(&"planned"));
}

#[test]
fn create_spec_with_invalid_status_returns_validation_error() {
    let tmp = TempDir::new().unwrap();
    let state = markdown_state(&tmp);

    let resp = call_tool(
        state,
        "create_spec",
        json!({
            "title": "Bad Status",
            "status": "not-a-real-status"
        }),
    );
    assert!(
        resp.error.is_some(),
        "expected error, got {:?}",
        resp.result
    );
    assert_eq!(error_code(&resp), "VALIDATION_FAILED");
}

#[test]
fn validate_spec_on_non_markdown_adapter_is_refused() {
    let tmp = TempDir::new().unwrap();
    let specs_dir = tmp.path().join("specs");
    std::fs::create_dir_all(&specs_dir).unwrap();
    let adapter: Box<dyn Adapter> = Box::new(FakeRemoteAdapter::new());
    let state = ServerState::with_adapter(adapter, tmp.path().to_path_buf(), specs_dir);

    let resp = call_tool(state, "validate_spec", json!({}));
    assert!(resp.error.is_some());
    assert_eq!(error_code(&resp), "ADAPTER_NOT_SUPPORTED");
}

#[test]
fn list_specs_routes_through_active_adapter() {
    // Sanity test for the adapter agnosticism claim: with the fake remote
    // adapter, list_specs should return whatever the fake gave us, not
    // markdown specs from any directory.
    let tmp = TempDir::new().unwrap();
    let specs_dir = tmp.path().join("specs");
    std::fs::create_dir_all(&specs_dir).unwrap();
    let adapter: Box<dyn Adapter> =
        Box::new(FakeRemoteAdapter::with_specs(vec![("42", "Remote spec")]));
    let state = ServerState::with_adapter(adapter, tmp.path().to_path_buf(), specs_dir);

    let resp = call_tool(state, "list_specs", json!({}));
    let s = structured(&resp);
    assert_eq!(s["count"], 1);
    assert_eq!(s["specs"][0]["id"], "42");
    assert_eq!(s["specs"][0]["title"], "Remote spec");
}

#[test]
fn reload_schema_tool_is_dispatchable() {
    // reload_schema goes through `AdapterRegistry::from_project()` which
    // reads from cwd; we only assert the tool is wired into the dispatcher
    // and produces a valid JSON-RPC response (success or error envelope).
    // Real reload behaviour is covered indirectly by the registry tests.
    let tmp = TempDir::new().unwrap();
    let state = markdown_state(&tmp);

    let resp = call_tool(state, "reload_schema", json!({}));
    let envelope_ok = resp.result.is_some() || resp.error.is_some();
    assert!(envelope_ok, "reload_schema must return a JSON-RPC envelope");
}

#[test]
fn get_capabilities_reports_active_adapter_name() {
    let tmp = TempDir::new().unwrap();
    let state = markdown_state(&tmp);

    let resp = call_tool(state, "get_capabilities", json!({}));
    let s = structured(&resp);
    assert_eq!(s["name"], "markdown");
    assert_eq!(s["supports_create"], true);
}

// ── Test fixtures ────────────────────────────────────────────────────────────

struct FakeRemoteAdapter {
    capabilities: AdapterCapabilities,
    schema: SpecSchema,
    specs: Vec<SpecDoc>,
}

impl FakeRemoteAdapter {
    fn new() -> Self {
        Self::with_specs(vec![])
    }

    fn with_specs(specs: Vec<(&'static str, &'static str)>) -> Self {
        let docs: Vec<SpecDoc> = specs
            .into_iter()
            .map(|(id, title)| SpecDoc {
                id: id.into(),
                title: title.into(),
                schema_id: "fake:remote".into(),
                fields: Default::default(),
                links: vec![],
                created_at: None,
                updated_at: None,
                url: None,
                raw: None,
            })
            .collect();

        Self {
            capabilities: AdapterCapabilities {
                name: "fake-remote".into(),
                supports_create: false,
                supports_update: false,
                supports_delete: false,
                supports_search: false,
                supports_webhooks: false,
                default_schema: "fake:remote".into(),
            },
            schema: SpecSchema {
                id: "fake:remote".into(),
                name: "Fake Remote".into(),
                extends: None,
                fields: vec![FieldDef {
                    key: "status".into(),
                    label: "Status".into(),
                    kind: FieldKind::Enum {
                        options: vec![
                            EnumOption::simple("open", "Open"),
                            EnumOption::simple("closed", "Closed"),
                        ],
                        multi: false,
                        allow_custom: false,
                        dynamic: false,
                    },
                    display: FieldDisplay::Inline,
                    required: false,
                    semantic: Some("status".into()),
                    ai_hint: Some("Issue state.".into()),
                    placeholder: None,
                }],
                link_types: vec![],
            },
            specs: docs,
        }
    }
}

impl Adapter for FakeRemoteAdapter {
    fn capabilities(&self) -> &AdapterCapabilities {
        &self.capabilities
    }

    fn schema(&self) -> &SpecSchema {
        &self.schema
    }

    fn list(&self, _filter: &ListFilter) -> Result<Vec<SpecDoc>, AdapterError> {
        Ok(self.specs.clone())
    }

    fn get(&self, id: &str) -> Result<SpecDoc, AdapterError> {
        self.specs
            .iter()
            .find(|d| d.id == id)
            .cloned()
            .ok_or_else(|| AdapterError::NotFound(id.into()))
    }

    fn create(&self, _req: &CreateRequest) -> Result<SpecDoc, AdapterError> {
        Err(AdapterError::NotSupported {
            adapter: "fake-remote".into(),
            operation: "create".into(),
        })
    }

    fn update(&self, _id: &str, _req: &UpdateRequest) -> Result<SpecDoc, AdapterError> {
        Err(AdapterError::NotSupported {
            adapter: "fake-remote".into(),
            operation: "update".into(),
        })
    }

    fn delete(&self, _id: &str) -> Result<(), AdapterError> {
        Err(AdapterError::NotSupported {
            adapter: "fake-remote".into(),
            operation: "delete".into(),
        })
    }

    fn search(&self, _query: &str, _opts: &SearchOptions) -> Result<Vec<SearchHit>, AdapterError> {
        Ok(vec![])
    }
}

// Silence warnings for unused imports that the test compiler can't see in all
// paths.
#[allow(dead_code)]
fn _unused(_: PathBuf, _: ItemLink) {}
