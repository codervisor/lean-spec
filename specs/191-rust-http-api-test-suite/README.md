---
status: in-progress
created: '2025-12-19'
priority: high
tags:
  - rust
  - http
  - testing
  - api
created_at: '2025-12-19T06:33:51.382148Z'
updated_at: '2025-12-20T01:50:43.965Z'
transitions:
  - status: in-progress
    at: '2025-12-20T01:50:43.965Z'
---

# Rust HTTP API Test Suite

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-19 · **Tags**: rust, http, testing, api


> Comprehensive integration test suite for Rust HTTP server before UI migration

## Overview

**Problem**: Rust HTTP server lacks comprehensive API tests. Before achieving UI parity, we need confidence that all existing endpoints work correctly and match expected behavior.

**Goal**: Create comprehensive integration test suite covering:
- All implemented endpoints (projects, specs, stats, deps, validation)
- Error handling and edge cases
- Multi-project mode scenarios
- Response format validation

**Why Now**: This is a **prerequisite** for [Spec 190](../190-ui-vite-parity-rust-backend/) - we must validate existing APIs before adding new ones.

## Current State

**Existing Tests**: Minimal
- Basic router creation test in `routes.rs`
- Unit tests in `leanspec_core` for spec loading
- No integration tests for HTTP endpoints
- No end-to-end API tests

**Coverage Gaps**:
- ❌ No project management endpoint tests
- ❌ No spec CRUD operation tests
- ❌ No search/filter tests
- ❌ No stats computation tests
- ❌ No dependency graph tests
- ❌ No validation endpoint tests
- ❌ No error response tests
- ❌ No multi-project switching tests

## Design

### Test Architecture

```
rust/leanspec-http/tests/
├── common/
│   ├── mod.rs              # Test utilities
│   ├── fixtures.rs         # Test fixtures (sample specs)
│   ├── server.rs           # Test server setup
│   └── schema_validator.rs # Schema validation utilities
├── integration/
│   ├── projects_test.rs    # Project management APIs
│   ├── specs_test.rs       # Spec operations
│   ├── search_test.rs      # Search functionality
│   ├── stats_test.rs       # Statistics
│   ├── deps_test.rs        # Dependencies
│   └── validate_test.rs    # Validation
├── schemas/
│   ├── nextjs_reference.rs # Reference schemas from Next.js API
│   └── compatibility_test.rs # Schema compatibility tests
└── scenarios/
    ├── multi_project_test.rs  # Multi-project scenarios
    └── error_cases_test.rs    # Error handling
```

### Test Strategy

**Integration Tests** (primary focus):
- Spin up HTTP server with test project registry
- Make real HTTP requests via `reqwest`
- Verify responses match expected format
- Test error conditions and edge cases

**Schema Compatibility Tests** (NEW):
- Validate Rust response schemas match Next.js API schemas
- Ensure field names match (camelCase vs snake_case)
- Verify response structure compatibility
- Test serialization consistency

**Comparative Testing** (RECOMMENDED):
- Run both Next.js API (`pnpm -F @leanspec/ui dev`) and Rust HTTP server side-by-side
- Make identical requests to both servers with same test data
- Compare JSON responses field-by-field
- Validate identical behavior and structure
- Catch subtle differences that static schema checks might miss

**Test Fixtures**:
- Reusable test projects with known spec structure
- Sample specs with various statuses, priorities, tags
- Projects with dependencies and sub-specs

**Tools**:
- `axum-test` or raw Axum router testing
- `reqwest` for HTTP client
- `serde_json` for response validation and comparison
- `schemars` for JSON Schema generation and validation
- `tempfile` for temporary test projects
- `tokio::test` for async tests
- `assert_json_diff` for comparing JSON responses between servers

## Plan

### Phase 1: Test Infrastructure (Day 1)
- [ ] Set up test module structure
- [ ] Create test fixture generator (sample specs)
- [ ] Create test server helper (spawn with temp registry)
- [ ] Add test utilities (assertions, matchers)
- [ ] Set up schema validation utilities
- [ ] Document reference Next.js API schemas
- [ ] Create dual-server test helper (optional: spawn both Next.js + Rust)
- [ ] Add JSON response comparison utilities

### Phase 2: Project Management Tests (Day 2)
- [ ] Test GET `/api/projects` (list all, empty state, multi-project)
- [ ] Validate response schema matches Next.js `/api/local-projects`
- [ ] Test POST `/api/projects` (add valid, invalid path, duplicate)
- [ ] Validate request/response schema compatibility
- [ ] Test GET `/api/projects/{id}` (existing, not found)
- [ ] Test PATCH `/api/projects/{id}` (update name, favorite, color)
- [ ] Test DELETE `/api/projects/{id}` (remove, not found, current project)
- [ ] Test POST `/api/projects/{id}/switch` (switch, not found)
- [ ] Test POST `/api/projects/{id}/favorite` (toggle)
- [ ] Test POST `/api/projects/refresh` (cleanup invalid)

### Phase 3: Spec Operations Tests (Day 3)
- [ ] Test GET `/api/specs` (list all, empty, with filters)
- [ ] Validate response schema matches Next.js `/api/projects/[id]/specs`
- [ ] Compare field serialization: camelCase vs snake_case
- [ ] Test GET `/api/specs` with query params (status, priority, tags, assignee)
- [ ] Test GET `/api/specs/{spec}` (by number, by name, not found)
- [ ] Test GET `/api/specs/{spec}` (verify required_by computed)
- [ ] Validate SpecDetail schema matches Next.js spec detail
- [ ] Test POST `/api/search` (query, filters, empty results)
- [ ] Validate SearchResponse schema compatibility
- [ ] Test POST `/api/search` (ranking by relevance)

### Phase 4: Stats & Dependencies Tests (Day 4)
- [ ] Test GET `/api/stats` (empty project, various statuses)
- [ ] Validate StatsResponse schema matches Next.js `/api/projects/[id]/stats`
- [ ] Compare field names: byStatus, byPriority, byTag
- [ ] Test GET `/api/stats` (verify counts by status, priority, tags)
- [ ] Test GET `/api/deps/{spec}` (simple dependency)
- [ ] Validate DependencyResponse schema
- [ ] Test GET `/api/deps/{spec}` (transitive dependencies)
- [ ] Test GET `/api/deps/{spec}` (circular dependencies)
- [ ] Test GET `/api/deps/{spec}` (spec not found)

### Phase 5: Validation Tests (Day 4)
- [ ] Test GET `/api/validate` (all specs valid)
- [ ] Test GET `/api/validate` (detect missing required fields)
- [ ] Test GET `/api/validate` (detect excessive line count)
- [ ] Test GET `/api/validate` (detect circular dependencies)
- [ ] Test GET `/api/validate/{spec}` (single spec validation)

### Phase 6: Multi-Project Scenarios (Day 5)
- [ ] Test project switching updates current context
- [ ] Test spec operations use current project
- [ ] Test stats reflect current project only
- [ ] Test dependencies within project scope
- [ ] Test concurrent project operations

### Phase 7: Error Handling (Day 5)
- [ ] Test 404 errors (not found resources)
- [ ] Test 400 errors (invalid input)
- [ ] Test 500 errors (internal errors)
- [ ] Test CORS headers
- [ ] Test malformed JSON requests
- [ ] Test invalid query parameters

## Success Criteria

**Must Have**:
- [ ] 80%+ code coverage for handlers
- [ ] All happy path scenarios tested
- [ ] All error conditions tested
- [ ] Multi-project switching tested
- [ ] **Schema compatibility validated with Next.js APIs**
- [ ] **All response fields use camelCase serialization**
- [ ] Tests run in CI
- [ ] Tests pass consistently

**Should Have**:
- [ ] Performance benchmarks (response time < 100ms)
- [ ] Concurrent request testing
- [ ] Large dataset testing (100+ specs)
- [ ] Test documentation/examples
- [ ] JSON Schema exports for documentation
- [ ] **Comparative tests with live Next.js API** (side-by-side validation)

## Test Examples

### Comparative Testing (Next.js vs Rust)

```rust
#[tokio::test]
#[ignore] // Only run when Next.js server is running
async fn test_compare_specs_response_with_nextjs() {
    // Set up test project with known specs
    let test_project = setup_test_project_with_fixtures().await;
    
    // Start Rust HTTP server
    let rust_client = reqwest::Client::new();
    let rust_base = "http://localhost:3001"; // Rust server
    
    // Assume Next.js is running on default port
    let nextjs_client = reqwest::Client::new();
    let nextjs_base = "http://localhost:3000"; // Next.js server
    
    // Compare GET /api/specs responses
    let rust_res = rust_client
        .get(format!("{}/api/specs", rust_base))
        .send()
        .await
        .unwrap();
    let rust_json: serde_json::Value = rust_res.json().await.unwrap();
    
    let nextjs_res = nextjs_client
        .get(format!("{}/api/projects/default/specs", nextjs_base))
        .send()
        .await
        .unwrap();
    let nextjs_json: serde_json::Value = nextjs_res.json().await.unwrap();
    
    // Compare response structure
    assert_json_diff::assert_json_eq!(
        rust_json["specs"][0]["specNumber"],
        nextjs_json["specs"][0]["specNumber"]
    );
    assert_json_diff::assert_json_eq!(
        rust_json["specs"][0]["specName"],
        nextjs_json["specs"][0]["specName"]
    );
    
    // Verify both use camelCase
    assert!(rust_json["specs"][0].get("specNumber").is_some());
    assert!(rust_json["specs"][0].get("spec_number").is_none());
}

#[tokio::test]
async fn test_compare_stats_response_structure() {
    let rust_app = test_server_with_fixtures().await;
    
    // Get stats from Rust API
    let rust_res = rust_app.get("/api/stats").send().await;
    let rust_json: serde_json::Value = rust_res.json().await;
    
    // Validate structure matches Next.js format
    // Next.js returns: { stats: { total, byStatus, byPriority, byTag, ... } }
    assert!(rust_json.get("total").is_some());
    assert!(rust_json.get("byStatus").is_some());
    assert!(rust_json.get("byPriority").is_some());
    assert!(rust_json.get("byTag").is_some());
    assert!(rust_json.get("completionPercentage").is_some());
    
    // Validate nested structure (camelCase)
    let by_status = &rust_json["byStatus"];
    assert!(by_status.get("planned").is_some());
    assert!(by_status.get("inProgress").is_some()); // camelCase
    assert!(by_status.get("in_progress").is_none()); // NOT snake_case
    assert!(by_status.get("complete").is_some());
}
```

### Schema Validation Test

```rust
#[tokio::test]
async fn test_spec_response_schema_compatibility() {
    let app = test_server_with_fixtures().await;
    
    // Get spec from Rust API
    let res = app.get("/api/specs/001-test-spec").send().await;
    assert_eq!(res.status(), 200);
    
    let spec: SpecDetail = res.json().await;
    
    // Validate required fields exist and use camelCase
    assert!(spec.spec_number.is_some());
    assert!(!spec.spec_name.is_empty());
    assert!(!spec.title.is_none());
    assert!(!spec.status.is_empty());
    assert!(!spec.content_md.is_empty());
    assert!(!spec.file_path.is_empty());
    
    // Validate field serialization matches Next.js format
    let json = serde_json::to_value(&spec).unwrap();
    assert!(json.get("specNumber").is_some()); // camelCase
    assert!(json.get("specName").is_some());   // camelCase
    assert!(json.get("contentMd").is_some());  // camelCase
    assert!(json.get("filePath").is_some());   // camelCase
    assert!(json.get("createdAt").is_some()); // camelCase
}
```

### Project Management Test

```rust
#[tokio::test]
async fn test_list_projects() {
    let app = test_server().await;
    
    // Add test projects
    let res = app.post("/api/projects")
        .json(&json!({ "path": "/tmp/test-project" }))
        .send()
        .await;
    assert_eq!(res.status(), 200);
    
    // List projects
    let res = app.get("/api/projects").send().await;
    assert_eq!(res.status(), 200);
    
    let body: ProjectsListResponse = res.json().await;
    assert_eq!(body.projects.len(), 1);
    assert!(body.current_project_id.is_some());
    
    // Validate schema matches Next.js /api/local-projects
    let json = serde_json::to_value(&body).unwrap();
    assert!(json.get("projects").is_some());
    assert!(json.get("currentProjectId").is_some()); // camelCase
}

#[tokio::test]
async fn test_switch_project() {
    let app = test_server().await;
    let project_id = add_test_project(&app, "/tmp/test1").await;
    
    let res = app.post(&format!("/api/projects/{}/switch", project_id))
        .send()
        .await;
    assert_eq!(res.status(), 200);
    
    // Verify current project changed
    let res = app.get("/api/projects").send().await;
    let body: ProjectsListResponse = res.json().await;
    assert_eq!(body.current_project_id, Some(project_id));
}
```

### Spec Operations Test

```rust
#[tokio::test]
async fn test_list_specs_with_filters() {
    let app = test_server_with_fixtures().await;
    
    // Filter by status
    let res = app.get("/api/specs")
        .query(&[("status", "in-progress")])
        .send()
        .await;
    assert_eq!(res.status(), 200);
    
    let body: ListSpecsResponse = res.json().await;
    assert!(body.specs.iter().all(|s| s.status == "in-progress"));
}

#[tokio::test]
async fn test_get_spec_computes_required_by() {
    let app = test_server_with_fixtures().await;
    
    // Get spec that is depended on by others
    let res = app.get("/api/specs/001-base-spec").send().await;
    assert_eq!(res.status(), 200);
    
    let spec: SpecDetail = res.json().await.spec;
    assert!(!spec.required_by.is_empty());
    assert!(spec.required_by.contains(&"002-dependent-spec".to_string()));
}
```

### Search Test

```rust
#[tokio::test]
async fn test_search_relevance_ranking() {
    let app = test_server_with_fixtures().await;
    
    let res = app.post("/api/search")
        .json(&json!({ "query": "rust" }))
        .send()
        .await;
    
    let body: SearchResponse = res.json().await;
    
    // Title matches should come first
    assert!(body.results[0].title.unwrap().contains("Rust"));
    
    // Results should be sorted by spec number descending (newer first) if same relevance
    for i in 1..body.results.len() {
        if body.results[i-1].title_match == body.results[i].title_match {
            assert!(body.results[i-1].spec_number >= body.results[i].spec_number);
        }
    }
}
```

## Test

**Meta-testing** (tests for the test suite):
- [ ] All tests pass on clean run
- [ ] Tests clean up temp files
- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests run in parallel safely
- [ ] Test fixtures are well-documented
- [ ] CI runs tests automatically

## Notes

### Schema Compatibility Strategy

**Reference Implementation**: Next.js API routes in `packages/ui/src/app/api/`
- `/api/local-projects` → Rust `/api/projects`
- `/api/projects/[id]/specs` → Rust `/api/specs`
- `/api/projects/[id]/stats` → Rust `/api/stats`
- `/api/projects/[id]/dependencies` → Rust `/api/deps/{spec}`

**Validation Approach**:
1. Extract sample responses from Next.js API routes
2. Compare field names and structure
3. Validate camelCase serialization in Rust responses
4. Document any intentional differences
5. Create compatibility tests that would fail on schema drift

**Comparative Testing (Recommended)**:
1. Run Next.js dev server: `pnpm -F @leanspec/ui dev` (port 3000)
2. Run Rust HTTP server: `cargo run --bin leanspec-http` (port 3001)
3. Point both at same test project directory
4. Make identical requests to both APIs
5. Compare JSON responses field-by-field using `assert_json_diff`
6. Validates not just schema but actual behavior

**Benefits of Live Comparison**:
- Catches subtle differences that static checks miss
- Validates actual serialization behavior
- Tests with real Next.js API implementation
- No need to manually extract/maintain reference schemas
- Confirms identical responses for same input

**Setup for Comparative Tests**:
```bash
# Terminal 1: Start Next.js API
cd /path/to/lean-spec
pnpm -F @leanspec/ui dev

# Terminal 2: Start Rust HTTP server
cd /path/to/lean-spec/rust/leanspec-http
cargo run

# Terminal 3: Run comparative tests
cargo test --test comparative -- --ignored
```

**Key Fields to Validate**:
- `specNumber` (not `spec_number`)
- `specName` (not `spec_name`)
- `contentMd` (not `content_md`)
- `filePath` (not `file_path`)
- `createdAt`, `updatedAt`, `completedAt` (not snake_case)
- `dependsOn`, `requiredBy` (not snake_case)
- `byStatus`, `byPriority`, `byTag` in stats (not snake_case)

**Current Status**: ✅ Rust types already use `#[serde(rename_all = "camelCase")]` - tests will validate this continues working.

### Why Integration Tests First?

1. **Verify current state**: Ensure existing APIs work before adding new ones
2. **Regression prevention**: Catch breaking changes immediately
3. **Schema validation**: Ensure compatibility with Next.js APIs
4. **Documentation**: Tests serve as API usage examples
5. **Confidence**: Safe to refactor with comprehensive tests
6. **Prerequisites**: Spec 190 backend work needs this foundation

### Why Schema Alignment Matters

**API Compatibility** is critical because:
- **@leanspec/ui-vite** expects exact same response format as Next.js APIs
- Field names must match (camelCase in JSON, not snake_case)
- Frontend code should work unchanged when switching backends
- Type safety: TypeScript types in frontend must match Rust serialization
- No adapter layer needed if schemas are identical

### Testing Philosophy

**Focus on behavior, not implementation**:
- Test HTTP responses, not internal state
- Verify response formats match frontend expectations
- **Validate schema compatibility with Next.js APIs**
- Test edge cases and error conditions
- Use realistic fixtures that mirror production data

**Keep tests fast**:
- Use in-memory project registry
- Generate fixtures dynamically
- Parallelize where possible
- Mock slow operations if needed

### Related Specs

- [Spec 190](../190-ui-vite-parity-rust-backend/) - Parent spec (blocks this)
- [Spec 186](../186-rust-http-server/) - Rust HTTP server implementation
- [Spec 175](../175-rust-cli-e2e-test-suite/) - CLI test suite (similar pattern)
- [Spec 176](../176-rust-mcp-server-test-suite/) - MCP test suite (similar pattern)

## Implementation Log

### 2025-12-19: Spec Created
- Identified need for comprehensive API tests before UI migration
- Defined test architecture and strategy
- 5-day implementation plan
- Priority: HIGH - prerequisite for Spec 190

### 2025-12-19: Schema Alignment Added
- Added explicit schema compatibility testing with Next.js APIs
- Documented key fields to validate (camelCase serialization)
- Added comparative testing strategy (run both servers side-by-side)
- Confirmed Rust types already use camelCase via `#[serde(rename_all = "camelCase")]`
- Added example tests for live API comparison
