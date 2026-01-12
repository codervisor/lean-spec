//! Test fixtures for creating sample projects and specs

#![allow(dead_code)]

use std::fs;
use std::path::Path;
use tempfile::TempDir;

use leanspec_http::{AppState, ProjectRegistry, ServerConfig};

fn test_registry_file(temp_dir: &TempDir) -> std::path::PathBuf {
    temp_dir
        .path()
        .join(".lean-spec-test")
        .join("projects.json")
}

/// Create a test project with some specs
pub fn create_test_project(dir: &Path) {
    let specs_dir = dir.join("specs");
    fs::create_dir_all(&specs_dir).unwrap();

    // Create first spec
    let spec1_dir = specs_dir.join("001-first-spec");
    fs::create_dir_all(&spec1_dir).unwrap();
    fs::write(
        spec1_dir.join("README.md"),
        r#"---
status: planned
created: '2025-01-01'
priority: high
tags:
  - test
  - api
---

# First Spec

## Overview

This is a test spec.

## Plan

- [ ] Step 1
- [ ] Step 2
"#,
    )
    .unwrap();

    // Create second spec that depends on first
    let spec2_dir = specs_dir.join("002-second-spec");
    fs::create_dir_all(&spec2_dir).unwrap();
    fs::write(
        spec2_dir.join("README.md"),
        r#"---
status: in-progress
created: '2025-01-02'
priority: medium
tags:
  - feature
depends_on:
  - 001-first-spec
---

# Second Spec

## Overview

This spec depends on the first spec.

## Plan

- [x] Step 1
- [ ] Step 2
"#,
    )
    .unwrap();

    // Create complete spec
    let spec3_dir = specs_dir.join("003-complete-spec");
    fs::create_dir_all(&spec3_dir).unwrap();
    fs::write(
        spec3_dir.join("README.md"),
        r#"---
status: complete
created: '2025-01-03'
priority: low
tags:
  - docs
---

# Complete Spec

## Overview

This spec is complete.

## Plan

- [x] Done
"#,
    )
    .unwrap();
}

/// Create a project with an invalid spec for validation tests
pub fn create_invalid_project(dir: &Path) {
    let specs_dir = dir.join("specs");
    fs::create_dir_all(&specs_dir).unwrap();

    let spec_dir = specs_dir.join("004-invalid-spec");
    fs::create_dir_all(&spec_dir).unwrap();
    fs::write(
        spec_dir.join("README.md"),
        r#"---
status: planned
created: '2025-02-28'
priority: medium
tags:
  - invalid
depends_on:
  - "" # intentionally empty to trigger validation error
---

# Invalid Spec

## Overview

Empty dependency should surface validation errors.
"#,
    )
    .unwrap();
}

/// Create a project with circular dependencies
pub fn create_circular_dependency_project(dir: &Path) {
    let specs_dir = dir.join("specs");
    fs::create_dir_all(&specs_dir).unwrap();

    // Create spec A that depends on B
    let spec_a = specs_dir.join("001-spec-a");
    fs::create_dir_all(&spec_a).unwrap();
    fs::write(
        spec_a.join("README.md"),
        r#"---
status: planned
created: '2025-01-01'
depends_on:
  - 002-spec-b
---

# Spec A
"#,
    )
    .unwrap();

    // Create spec B that depends on A (circular)
    let spec_b = specs_dir.join("002-spec-b");
    fs::create_dir_all(&spec_b).unwrap();
    fs::write(
        spec_b.join("README.md"),
        r#"---
status: planned
created: '2025-01-02'
depends_on:
  - 001-spec-a
---

# Spec B
"#,
    )
    .unwrap();
}

/// Create an empty project (no specs)
pub fn create_empty_project(dir: &Path) {
    let specs_dir = dir.join("specs");
    fs::create_dir_all(&specs_dir).unwrap();
}

/// Create a test state with a project (async version)
pub async fn create_test_state(temp_dir: &TempDir) -> AppState {
    create_test_project(temp_dir.path());

    let config = ServerConfig::default();
    let registry = ProjectRegistry::new_with_file_path(test_registry_file(temp_dir)).unwrap();
    let state = AppState::with_registry(config, registry);

    // Add project via the registry
    {
        let mut reg = state.registry.write().await;
        let _ = reg.add(temp_dir.path());
    }

    state
}

/// Create a test state without any project
pub async fn create_empty_state(temp_dir: &TempDir) -> AppState {
    let config = ServerConfig::default();
    let registry = ProjectRegistry::new_with_file_path(test_registry_file(temp_dir)).unwrap();
    AppState::with_registry(config, registry)
}
