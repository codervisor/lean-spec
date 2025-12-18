---
status: planned
created: 2025-12-18
priority: high
tags:
- testing
- rust
- mcp
- quality
depends_on:
- 175-rust-cli-e2e-test-suite
created_at: 2025-12-18T05:58:43.559844758Z
updated_at: 2025-12-18T05:59:47.235985898Z
---

# Rust MCP Server Test Suite

> **Status**: 🗓️ Planned · **Created**: 2025-12-18

## Overview

Create comprehensive test coverage for the Rust MCP (Model Context Protocol) server implementation. The TypeScript MCP implementation was tested through CLI tests, but the Rust version needs dedicated protocol-level testing.

### Current State

**Rust MCP** (`rust/leanspec-mcp/`):
- ❌ NO tests at all
- 3 source files: `main.rs`, `protocol.rs`, `tools.rs`
- Has `tempfile` as dev-dependency but unused
- Implements MCP protocol for AI assistant integration

**TypeScript MCP**:
- Tested through `packages/cli/src/__e2e__/mcp-tools.e2e.test.ts`
- Covered by CLI test suite (basic functionality)
- Protocol implementation in `packages/cli/src/mcp-server.test.ts`

### Why Separate Test Suite?

The MCP server has unique requirements:
1. **Protocol compliance** - Must follow MCP specification
2. **JSON-RPC communication** - Request/response validation
3. **Tool invocations** - Each tool needs testing
4. **Error handling** - Protocol-level error responses
5. **Concurrency** - Handle multiple requests
6. **AI Assistant Integration** - Test with real assistant patterns

### Goals

1. Test MCP protocol implementation (JSON-RPC 2.0)
2. Test all MCP tools exposed by the server
3. Validate error handling and edge cases
4. Ensure protocol compliance with MCP specification
5. Integration tests with AI assistant simulators
6. Performance and concurrency testing

## MCP Server Architecture

### Protocol Layer (`protocol.rs`)
- JSON-RPC 2.0 message handling
- Request/response serialization
- Error response formatting
- Protocol versioning
- Capability negotiation

### Tools Layer (`tools.rs`)
- Tool registration and discovery
- Tool parameter validation
- Tool execution
- Result formatting
- Tool metadata (name, description, schema)

### Server (`main.rs`)
- Stdio transport (reads stdin, writes stdout)
- Message routing to tools
- Lifecycle management (initialize, shutdown)
- Error boundary

## Plan

### Phase 1: Test Infrastructure
- [ ] Add test dependencies to `Cargo.toml`:
  ```toml
  [dev-dependencies]
  tempfile.workspace = true
  pretty_assertions.workspace = true
  tokio-test = "0.4"           # Async testing utilities
  assert-json-diff = "2.0"     # JSON comparison
  serde_json.workspace = true  # JSON handling
  ```
- [ ] Create test helpers (`tests/helpers/`):
  - `mock_transport.rs` - Mock stdio for testing
  - `json_rpc.rs` - JSON-RPC message builders
  - `assertions.rs` - Custom assertions for MCP
  - `fixtures.rs` - Sample projects and data
- [ ] Set up test fixtures:
  - Sample project structures (minimal, complex, with-deps)
  - Mock AI assistant requests
  - Expected tool responses
  - Error scenarios

### Phase 2: Protocol Tests
- [ ] **JSON-RPC 2.0 Compliance** (`tests/protocol/json_rpc.rs`)
  - Valid request parsing
  - Response formatting (success)
  - Error response formatting
  - Method not found errors
  - Invalid JSON handling
  - Missing required fields
  - Batch requests (if supported)
- [ ] **MCP Protocol Initialization** (`tests/protocol/handshake.rs`)
  - Initialize request/response
  - Capability negotiation
  - Protocol version compatibility
  - Client info exchange
  - Server info response
- [ ] **Transport Layer** (`tests/protocol/transport.rs`)
  - Stdio message reading (line-by-line)
  - Message framing
  - Message buffering
  - Connection handling
  - EOF handling
  - Large message handling

### Phase 3: Tool Tests
Test each MCP tool individually with valid/invalid inputs:

- [ ] **`list` tool** (`tests/tools/list.rs`)
  - List all specs (no filters)
  - Filter by status
  - Filter by tags
  - Filter by priority
  - Filter by assignee
  - Combined filters
  - Empty result handling
  - Invalid filter values
  
- [ ] **`view` tool** (`tests/tools/view.rs`)
  - View spec by number
  - View spec by name
  - View with sub-spec file
  - Raw markdown output
  - JSON output
  - Invalid spec path
  - Missing spec
  
- [ ] **`create` tool** (`tests/tools/create.rs`)
  - Create with name only
  - Create with title
  - Create with template
  - Create with content
  - Create with all options
  - Duplicate name handling
  - Invalid name characters
  
- [ ] **`update` tool** (`tests/tools/update.rs`)
  - Update status
  - Update priority
  - Update assignee
  - Add tags
  - Remove tags
  - Combined updates
  - Invalid spec
  - Invalid field values
  
- [ ] **`validate` tool** (`tests/tools/validate.rs`)
  - Validate single spec
  - Validate all specs
  - Check dependencies flag
  - Strict mode
  - Warnings only mode
  - Return validation results
  
- [ ] **`deps` tool** (`tests/tools/deps.rs`)
  - Show dependencies (default)
  - Upstream only
  - Downstream only
  - With depth limit
  - Circular dependency detection
  - Invalid spec
  
- [ ] **`link` tool** (`tests/tools/link.rs`)
  - Link two specs (depends_on)
  - Multiple dependencies
  - Circular dependency prevention
  - Invalid spec IDs
  - Already linked handling
  
- [ ] **`unlink` tool** (`tests/tools/unlink.rs`)
  - Unlink single dependency
  - Remove all dependencies
  - Invalid spec
  - Non-existent link
  
- [ ] **`board` tool** (`tests/tools/board.rs`)
  - Group by status (default)
  - Group by priority
  - Group by assignee
  - Group by tag
  - JSON output format
  
- [ ] **`search` tool** (`tests/tools/search.rs`)
  - Simple text search
  - Advanced search syntax
  - Limit results
  - Boolean operators
  - Field filters
  - Fuzzy matching
  - Empty query handling
  
- [ ] **`tokens` tool** (`tests/tools/tokens.rs`)
  - Count single spec
  - Count all specs
  - Include sub-specs
  - Detailed breakdown
  - Invalid spec
  
- [ ] **`stats` tool** (`tests/tools/stats.rs`)
  - Basic statistics
  - Detailed statistics
  - Count by status/priority
  - Recent activity
  - Empty project handling

### Phase 4: Integration Tests
- [ ] **End-to-end Workflows** (`tests/integration/workflows.rs`)
  - Create→link→update→validate sequence
  - Search→view workflow
  - Board→list→view workflow
  - Multiple tool calls in session
  - State consistency across tools
- [ ] **Multi-tool Sessions** (`tests/integration/sessions.rs`)
  - Initialize once, call multiple tools
  - Tool state isolation
  - Shared spec directory access
  - Error recovery between tools
- [ ] **Concurrent Requests** (`tests/integration/concurrency.rs`)
  - Multiple tool calls in parallel
  - Read/write conflict handling
  - File system locking if needed
  - Race condition testing

### Phase 5: Error Handling
- [ ] **Protocol-level Errors** (`tests/protocol/errors.rs`)
  - Invalid JSON
  - Malformed requests (missing id, method)
  - Unsupported methods
  - Invalid parameters type
  - Parse errors
  - Internal errors
- [ ] **Tool-level Errors** (`tests/tools/error_cases.rs`)
  - Missing required parameters
  - Invalid parameter types
  - File system errors (permissions)
  - Missing spec directory
  - Corrupted spec files
  - Git repository errors (for backfill)
- [ ] **Error Response Formatting** (`tests/protocol/error_format.rs`)
  - Standard JSON-RPC error codes
  - Custom error codes for MCP
  - Error messages are clear
  - Error data includes context
  - Stack traces in debug mode

### Phase 6: Performance & Reliability
- [ ] **Performance Benchmarks** (`tests/performance/benchmarks.rs`)
  - Tool execution time baseline
  - Large spec repository (100+ specs)
  - Complex dependency graphs
  - Search performance with many specs
  - Memory usage profiling
- [ ] **Stress Testing** (`tests/performance/stress.rs`)
  - Rapid consecutive requests
  - Many tools called quickly
  - Large message payloads
  - Timeout handling
  - Resource cleanup

## Test Structure

```
rust/leanspec-mcp/
  tests/
    helpers/
      mod.rs              # Test utilities
      mock_transport.rs   # Mock stdio transport
      json_rpc.rs         # JSON-RPC message builders
      assertions.rs       # Custom MCP assertions
      fixtures.rs         # Test fixtures management
    protocol/
      mod.rs              # Protocol test helpers
      json_rpc.rs         # JSON-RPC 2.0 compliance
      handshake.rs        # Initialization sequence
      transport.rs        # Transport layer
      errors.rs           # Error handling
      error_format.rs     # Error response format
    tools/
      mod.rs              # Tool test helpers
      list.rs             # List tool tests
      view.rs             # View tool tests
      create.rs           # Create tool tests
      update.rs           # Update tool tests
      validate.rs         # Validate tool tests
      deps.rs             # Deps tool tests
      link.rs             # Link tool tests
      unlink.rs           # Unlink tool tests
      board.rs            # Board tool tests
      search.rs           # Search tool tests
      tokens.rs           # Tokens tool tests
      stats.rs            # Stats tool tests
      error_cases.rs      # Tool error scenarios
    integration/
      mod.rs              # Integration helpers
      workflows.rs        # Multi-tool workflows
      sessions.rs         # Multi-tool sessions
      concurrency.rs      # Concurrent requests
      e2e.rs             # End-to-end scenarios
    performance/
      mod.rs              # Performance helpers
      benchmarks.rs       # Performance benchmarks
      stress.rs           # Stress testing
    fixtures/
      sample-project/     # 10-20 specs
      large-project/      # 100+ specs
      with-dependencies/  # Complex graph
      corrupted/          # Invalid specs
```

## MCP Protocol Reference

Follow the official specifications:
- **MCP Protocol**: https://modelcontextprotocol.io/
- **JSON-RPC 2.0**: https://www.jsonrpc.org/specification

### JSON-RPC Request Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list",
    "arguments": {
      "status": "planned"
    }
  }
}
```

### JSON-RPC Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Spec 001: Feature A (planned)"
      }
    ]
  }
}
```

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: missing required field 'name'",
    "data": {
      "field": "name"
    }
  }
}
```

## Example Test Pattern

```rust
// tests/tools/list.rs
use leanspec_mcp::tools::ListTool;
use serde_json::json;
use pretty_assertions::assert_eq;

#[tokio::test]
async fn test_list_tool_success() {
    // Setup test project
    let temp_dir = create_test_project(&[
        ("001-feature-a", "planned"),
        ("002-feature-b", "in-progress"),
    ]);
    
    // Create tool instance
    let tool = ListTool::new(temp_dir.path());
    
    // Call with filter
    let params = json!({
        "status": "planned"
    });
    
    let result = tool.execute(params).await?;
    
    // Verify response
    assert!(result.is_success());
    let specs = result.specs().unwrap();
    assert_eq!(specs.len(), 1);
    assert_eq!(specs[0].status, "planned");
}

#[tokio::test]
async fn test_list_tool_invalid_status() {
    let temp_dir = create_test_project(&[]);
    let tool = ListTool::new(temp_dir.path());
    
    let params = json!({
        "status": "invalid-status"
    });
    
    let result = tool.execute(params).await;
    
    assert!(result.is_err());
    assert_error_code(&result, ErrorCode::InvalidParams);
    assert_error_message(&result, "Invalid status value");
}
```

## Mock Transport Pattern

```rust
// tests/helpers/mock_transport.rs
use std::sync::{Arc, Mutex};

pub struct MockTransport {
    input: Arc<Mutex<Vec<String>>>,
    output: Arc<Mutex<Vec<String>>>,
}

impl MockTransport {
    pub fn new() -> Self {
        Self {
            input: Arc::new(Mutex::new(Vec::new())),
            output: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    pub fn send(&self, message: String) {
        self.input.lock().unwrap().push(message);
    }
    
    pub fn recv(&self) -> Option<String> {
        self.output.lock().unwrap().pop()
    }
    
    pub fn clear(&self) {
        self.input.lock().unwrap().clear();
        self.output.lock().unwrap().clear();
    }
}
```

## Success Criteria

- [ ] All MCP protocol features tested
- [ ] All 12+ MCP tools have test coverage (valid + invalid cases)
- [ ] Protocol compliance validated against spec
- [ ] Error handling comprehensive (protocol + tool errors)
- [ ] Integration tests for multi-tool workflows
- [ ] Concurrency tests passing
- [ ] Performance benchmarks established (<100ms per tool call)
- [ ] CI/CD pipeline integration
- [ ] Test execution time <10 seconds
- [ ] Documentation for MCP testing patterns
- [ ] Zero test failures on main branch
- [ ] 90%+ code coverage for MCP crate

## Notes

### Test Execution Order

1. **Start with Protocol Tests** - Ensure foundation is solid
2. **Individual Tool Tests** - Test each tool in isolation
3. **Integration Tests** - Test tool interactions
4. **Error Handling** - Verify all error paths
5. **Performance** - Benchmark and optimize

### AI Assistant Simulation

Create realistic test scenarios based on common AI assistant patterns:

```rust
// Simulate Claude/Copilot workflow
async fn test_ai_workflow_create_and_link() {
    let mcp = create_test_server();
    
    // 1. Search for existing specs
    let search_result = mcp.call("search", json!({
        "query": "authentication"
    })).await?;
    
    // 2. Create new spec
    let create_result = mcp.call("create", json!({
        "name": "oauth-integration",
        "title": "OAuth 2.0 Integration"
    })).await?;
    
    // 3. Link to existing spec
    let link_result = mcp.call("link", json!({
        "spec": "oauth-integration",
        "depends_on": "018-authentication-system"
    })).await?;
    
    // 4. Validate changes
    let validate_result = mcp.call("validate", json!({})).await?;
    
    assert!(validate_result.is_success());
}
```

### Incremental Implementation

Start with critical tools first:
1. `list` - Most commonly used
2. `view` - Core functionality
3. `create` - Essential for agents
4. `update` - Data integrity
5. `validate` - Quality assurance
6. Others - Progressive enhancement

### Test Maintenance

- Keep fixtures small and focused
- Document complex test scenarios
- Refactor common patterns into helpers
- Update tests when protocol changes
- Monitor test execution time

## Related Specs

- **Spec 175**: Rust CLI E2E Test Suite (CLI testing foundation)
- **Spec 177**: UI E2E Test Suite (UI testing)
- **Spec 170**: CLI/MCP/Core Rust Migration Evaluation (migration context)
- **Spec 173**: Rust Binaries CI/CD Pipeline (test infrastructure)
- **Spec 33**: MCP Server Integration (original TypeScript implementation)
