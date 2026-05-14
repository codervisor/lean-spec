---
status: planned
created: 2026-05-14
priority: high
tags:
- testing
- adapters
- quality
depends_on:
- "383-markdown-adapter-domain-isolation"
- "384-github-adapter"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# Adapter Compliance Test Harness

## Overview

Every `Adapter` implementation must satisfy the same behavioral contract. Without
a shared test suite, each adapter gets tested differently and gaps appear over
time. This spec introduces a reusable compliance harness that any adapter can run
to verify it correctly implements the `Adapter` trait contract.

Done when: `MarkdownAdapter` and `GitHubAdapter` both pass the compliance suite,
and the harness is ready for `AdoAdapter` and `JiraAdapter` to plug in.

## Design

### Structure

The harness lives in `rust/leanspec-core/src/adapters/test_harness.rs` (or as
a test-only module). It exposes a function:

```rust
/// Run the full adapter compliance suite against an adapter backed by a
/// temporary workspace. `setup` is called once to populate initial state.
pub fn run_compliance_suite<A, S>(adapter: A, setup: S)
where
    A: Adapter,
    S: FnOnce(&A),   // seed initial items if needed
```

Alternatively, implemented as a macro `adapter_compliance_tests!(adapter_fn)`
that expands to a module of `#[test]` functions. Macro form is preferred because
it produces individually named test cases visible in `cargo test` output.

### Test contract categories

**1. Schema consistency**
- `schema().fields` is non-empty
- Every field has a non-empty `key` and `label`
- At least one field has semantic `"status"`
- All `FieldKind::Enum` fields with `dynamic: false` have at least one option
- `schema().key_for_semantic("status")` returns `Some(_)`

**2. CRUD round-trip**
- `create(req)` returns a `SpecDoc` with `id` populated
- `get(id)` on the returned id returns the same title and fields
- `update(id, req)` with a new title: subsequent `get` returns updated title
- `update(id, req)` with a field change: subsequent `get` reflects change
- `delete(id)`: subsequent `get` returns `Err(AdapterError::NotFound(_))`
  — or for adapters where delete = archive, the item is no longer returned
  by `list()` without `include_archived: true`

**3. List and filter**
- `list(&ListFilter::default())` returns created item
- `list` with `fields: { "status": ["<value>"] }` returns only matching items
- `list` with `text: Some("unique phrase")` returns matching item
- `list` with `include_archived: false` excludes deleted/closed items

**4. Search**
- `search("unique title phrase", &SearchOptions::default())` returns the item
- `search("nonexistent_xyz_12345", …)` returns empty vec

**5. Links (optional — skip if adapter returns empty links)**
- If adapter supports links: `create` with a link, `get_links(id)` returns it

**6. Error cases**
- `get("nonexistent_id_xyz")` returns `Err(AdapterError::NotFound(_))`
- `update("nonexistent_id_xyz", req)` returns `Err(AdapterError::NotFound(_))`
- `delete("nonexistent_id_xyz")` returns `Err(AdapterError::NotFound(_))`

### Adapter-under-test setup

Each adapter provides a temporary workspace factory:

```rust
// For MarkdownAdapter:
fn make_markdown_adapter() -> (MarkdownAdapter, TempDir) {
    let dir = tempfile::tempdir().unwrap();
    let adapter = MarkdownAdapter::new(dir.path().to_str().unwrap());
    (adapter, dir)
}

// For GitHubAdapter (integration, feature-gated):
#[cfg(feature = "github-integration-tests")]
fn make_github_adapter() -> GitHubAdapter {
    GitHubAdapter::new(
        &std::env::var("TEST_GITHUB_OWNER").unwrap(),
        &std::env::var("TEST_GITHUB_REPO").unwrap(),
        "GITHUB_TOKEN",
    ).unwrap()
}
```

### Invocation in adapter test modules

```rust
// In adapters/markdown/mod.rs tests:
#[cfg(test)]
mod compliance {
    use super::*;
    use crate::adapters::test_harness::run_compliance_suite;

    #[test]
    fn markdown_adapter_compliance() {
        let (adapter, _dir) = make_markdown_adapter();
        run_compliance_suite(adapter, |_| {});
    }
}

// In adapters/github.rs tests (integration):
#[cfg(all(test, feature = "github-integration-tests"))]
mod compliance {
    adapter_compliance_tests!(make_github_adapter);
}
```

## Plan

- [ ] Create `rust/leanspec-core/src/adapters/test_harness.rs`
  - [ ] Schema consistency test group
  - [ ] CRUD round-trip test group
  - [ ] List and filter test group
  - [ ] Search test group
  - [ ] Link test group (optional / skip-if-unsupported)
  - [ ] Error cases test group
- [ ] Define `adapter_compliance_tests!` macro that calls `run_compliance_suite`
- [ ] Wire compliance suite into `MarkdownAdapter` tests — all cases must pass
- [ ] Wire compliance suite into `GitHubAdapter` unit tests (with mock server)
- [ ] Add compliance harness invocation stubs in `AdoAdapter` and `JiraAdapter` (for specs 396/398 to fill in)
- [ ] Export harness from `leanspec-core` under `#[cfg(test)]` or `test-utils` feature flag

## Test

- [ ] `cargo test -p leanspec-core` — all compliance cases pass for `MarkdownAdapter`
- [ ] `cargo test -p leanspec-core --features github` — all compliance cases pass for `GitHubAdapter` (mock)
- [ ] Compliance test names appear individually in `cargo test` output (not as one monolithic test)
- [ ] An adapter that returns wrong data on `get()` after `create()` fails the round-trip test

## Notes

### Why not a trait with default test methods?

Rust does not support `#[test]` methods in traits. A macro that expands to a
module of test functions is the idiomatic approach for shared test suites across
multiple implementors.

### Skippable contract points

Not all adapters support all operations the same way. Contracts that cannot
hold for a specific adapter (e.g. hard delete vs soft archive) are expressed as
optional assertions with a skip mechanism:

```rust
pub struct ComplianceOptions {
    pub delete_is_archive: bool,  // default false
    pub supports_links: bool,     // default false
}
```
