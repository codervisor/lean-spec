---
status: planned
created: 2025-12-19
priority: high
tags:
- rust
- backend
- api
- http
depends_on:
- 191-rust-http-api-test-suite
- 194-api-contract-test-suite
created_at: 2025-12-19T06:36:15.644825Z
updated_at: 2025-12-20T07:13:38.535108Z
---

# Backend API Parity: Rust HTTP Server Feature Completion

> Implement missing Rust HTTP API endpoints to achieve parity with Next.js API routes

## Overview

**Part of**: [Spec 190](../190-ui-vite-parity-rust-backend/) - UI-Vite Parity

**Problem**: Rust HTTP server missing critical endpoints that Next.js API routes provide:
- Metadata update (file writing)
- Project discovery (filesystem scanning)
- Directory listing (file browser)
- Context file management
- Project validation

**Goal**: Implement all missing endpoints so Rust HTTP server has **identical functionality** to Next.js API routes.

**Depends on**: [Spec 191](../191-rust-http-api-test-suite/) - API test suite must exist first

## Analysis

### Missing Endpoints (Priority Order)

| Endpoint                                  | Purpose                    | Impact                             | Est. Time |
| ----------------------------------------- | -------------------------- | ---------------------------------- | --------- |
| PATCH `/api/specs/{spec}/metadata`        | Update spec metadata       | **CRITICAL** - Blocks editing      | 2 days    |
| POST `/api/local-projects/discover`       | Scan for LeanSpec projects | **HIGH** - Blocks onboarding       | 1 day     |
| POST `/api/local-projects/list-directory` | Browse directories         | **HIGH** - Blocks project creation | 1 day     |
| GET `/api/context`                        | List context files         | **MEDIUM** - Context page          | 0.5 days  |
| GET `/api/context/{file}`                 | Get context file content   | **MEDIUM** - Context viewer        | 0.5 days  |
| POST `/api/projects/{id}/validate`        | Validate project           | **LOW** - Nice to have             | 0.5 days  |

**Total Estimate**: ~5.5 days

### Implementation Requirements

**1. Metadata Update** (PATCH `/api/specs/{spec}/metadata`)
- Add file writing to `leanspec_core`
- Parse frontmatter, update fields, preserve content
- Atomic file write (write to temp, then rename)
- Support fields: `status`, `priority`, `tags`, `assignee`
- Return updated frontmatter in response

**2. Project Discovery** (POST `/api/local-projects/discover`)
- Scan filesystem starting from given path
- Find directories with `.lean-spec/` folder
- Extract project name from `package.json` or directory name
- Skip hidden directories (`.git`, `node_modules`)
- Return list of discovered projects with paths

**3. Directory Listing** (POST `/api/local-projects/list-directory`)
- List contents of given directory path
- Return entries with: name, type (file/dir), size, modified time
- Support parent directory navigation (`..`)
- Filter hidden files by default (optional param to show)
- Handle permission errors gracefully

**4. Context API** (GET `/api/context`)
- List files in `.lean-spec/context/` of current project
- Return file metadata: name, size, modified time
- Support recursive subdirectories
- Handle missing context directory

**5. Context File Detail** (GET `/api/context/{file}`)
- Read file content from `.lean-spec/context/`
- Detect file type/language for syntax highlighting hint
- Return content as string with metadata
- Handle binary files (return base64 or error)

**6. Project Validation** (POST `/api/projects/{id}/validate`)
- Check if project path exists on filesystem
- Verify `.lean-spec/` directory exists
- Check for specs directory
- Return validation status with specific errors

## Design

### Metadata Update Implementation

**Add to `leanspec_core`**:

```rust
// leanspec_core/src/spec_writer.rs
pub struct SpecWriter {
    specs_dir: PathBuf,
}

impl SpecWriter {
    pub fn new(specs_dir: &Path) -> Self {
        Self { specs_dir: specs_dir.to_path_buf() }
    }
    
    pub fn update_metadata(
        &self,
        spec_path: &str,
        updates: MetadataUpdate,
    ) -> Result<Frontmatter> {
        // 1. Load spec
        let spec = SpecLoader::new(&self.specs_dir).load(spec_path)?;
        let spec = spec.ok_or_else(|| Error::NotFound)?;
        
        // 2. Parse frontmatter
        let mut frontmatter = spec.frontmatter.clone();
        
        // 3. Apply updates
        if let Some(status) = updates.status {
            frontmatter.status = status;
        }
        if let Some(priority) = updates.priority {
            frontmatter.priority = Some(priority);
        }
        if let Some(tags) = updates.tags {
            frontmatter.tags = tags;
        }
        if let Some(assignee) = updates.assignee {
            frontmatter.assignee = assignee;
        }
        
        // 4. Update timestamp
        frontmatter.updated = Some(chrono::Utc::now());
        
        // 5. Rebuild content
        let content = rebuild_spec_with_frontmatter(&spec.content, &frontmatter)?;
        
        // 6. Atomic write
        atomic_write_file(&spec.file_path, &content)?;
        
        Ok(frontmatter)
    }
}

fn atomic_write_file(path: &Path, content: &str) -> Result<()> {
    use std::fs;
    
    // Write to temp file
    let temp_path = path.with_extension("tmp");
    fs::write(&temp_path, content)?;
    
    // Atomic rename
    fs::rename(&temp_path, path)?;
    
    Ok(())
}

fn rebuild_spec_with_frontmatter(
    original_content: &str,
    frontmatter: &Frontmatter,
) -> Result<String> {
    // Find frontmatter block
    if !original_content.starts_with("---") {
        return Err(Error::InvalidFormat("Missing frontmatter".into()));
    }
    
    let parts: Vec<&str> = original_content.splitn(3, "---").collect();
    if parts.len() < 3 {
        return Err(Error::InvalidFormat("Invalid frontmatter".into()));
    }
    
    // Serialize new frontmatter
    let new_fm = serde_yaml::to_string(frontmatter)?;
    
    // Rebuild: frontmatter + content
    Ok(format!("---\n{}---{}", new_fm, parts[2]))
}
```

**Add HTTP handler**:

```rust
// leanspec-http/src/handlers/specs.rs
pub async fn update_metadata(
    State(state): State<AppState>,
    Path(spec_id): Path<String>,
    Json(updates): Json<MetadataUpdate>,
) -> ApiResult<Json<UpdateMetadataResponse>> {
    let specs_dir = state.current_specs_dir().await.ok_or_else(|| {
        (StatusCode::BAD_REQUEST, Json(ApiError::no_project_selected()))
    })?;
    
    let writer = SpecWriter::new(&specs_dir);
    let frontmatter = writer.update_metadata(&spec_id, updates)
        .map_err(|e| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError::internal_error(&e.to_string())))
        })?;
    
    Ok(Json(UpdateMetadataResponse { frontmatter }))
}
```

### Project Discovery Implementation

```rust
// leanspec_core/src/project_discovery.rs
pub struct ProjectDiscovery {
    max_depth: usize,
}

impl ProjectDiscovery {
    pub fn discover(&self, start_path: &Path) -> Result<Vec<DiscoveredProject>> {
        let mut projects = Vec::new();
        self.scan_directory(start_path, 0, &mut projects)?;
        Ok(projects)
    }
    
    fn scan_directory(
        &self,
        path: &Path,
        depth: usize,
        projects: &mut Vec<DiscoveredProject>,
    ) -> Result<()> {
        if depth > self.max_depth {
            return Ok(());
        }
        
        // Check if this is a LeanSpec project
        if path.join(".lean-spec").exists() {
            projects.push(DiscoveredProject {
                path: path.to_path_buf(),
                name: extract_project_name(path)?,
            });
            return Ok(()); // Don't scan nested projects
        }
        
        // Scan subdirectories
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() && !is_ignored(&path) {
                self.scan_directory(&path, depth + 1, projects)?;
            }
        }
        
        Ok(())
    }
}

fn is_ignored(path: &Path) -> bool {
    let name = path.file_name().unwrap().to_str().unwrap();
    matches!(name, ".git" | "node_modules" | "target" | ".next" | "dist")
}
```

### Directory Listing Implementation

```rust
// leanspec-http/src/handlers/directories.rs
pub async fn list_directory(
    Json(req): Json<ListDirectoryRequest>,
) -> ApiResult<Json<ListDirectoryResponse>> {
    let path = PathBuf::from(&req.path);
    
    if !path.exists() {
        return Err((StatusCode::NOT_FOUND, Json(ApiError::new("NOT_FOUND", "Path does not exist"))));
    }
    
    let mut entries = Vec::new();
    
    for entry in fs::read_dir(&path).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError::internal_error(&e.to_string())))
    })? {
        let entry = entry.map_err(|e| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiError::internal_error(&e.to_string())))
        })?;
        
        let metadata = entry.metadata().ok();
        let name = entry.file_name().to_string_lossy().to_string();
        
        // Skip hidden files unless requested
        if !req.show_hidden.unwrap_or(false) && name.starts_with('.') {
            continue;
        }
        
        entries.push(DirectoryEntry {
            name,
            is_dir: metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false),
            size: metadata.as_ref().and_then(|m| Some(m.len())),
            modified: metadata.and_then(|m| m.modified().ok().map(|t| t.into())),
        });
    }
    
    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    Ok(Json(ListDirectoryResponse {
        path: path.to_string_lossy().to_string(),
        entries,
    }))
}
```

## Plan

### Day 1: Setup & Metadata Update
- [ ] Add `spec_writer.rs` to `leanspec_core`
- [ ] Implement `update_metadata` function
- [ ] Implement atomic file write
- [ ] Implement frontmatter rebuild
- [ ] Add unit tests for spec writer
- [ ] Add HTTP handler in `leanspec-http`
- [ ] Write integration tests

### Day 2: Project Discovery
- [ ] Add `project_discovery.rs` to `leanspec_core`
- [ ] Implement recursive directory scanning
- [ ] Add ignore patterns
- [ ] Implement project name extraction
- [ ] Add HTTP handler
- [ ] Write integration tests

### Day 3: Directory Listing & Context
- [ ] Implement directory listing handler
- [ ] Add sorting and filtering logic
- [ ] Implement context file listing
- [ ] Implement context file reading
- [ ] Add HTTP handlers
- [ ] Write integration tests

### Day 4: Project Validation & Polish
- [ ] Implement project validation endpoint
- [ ] Add comprehensive error handling
- [ ] Update API documentation
- [ ] Add examples to comments

### Day 5: Integration Testing & CI
- [ ] Run full test suite
- [ ] Fix any failing tests
- [ ] Add tests to CI pipeline
- [ ] Update changelog

## Test

**Unit Tests** (leanspec_core):
- [ ] Metadata update preserves content
- [ ] Atomic write handles errors
- [ ] Frontmatter rebuild maintains format
- [ ] Project discovery finds nested projects
- [ ] Project discovery respects ignore patterns
- [ ] Directory listing sorts correctly

**Integration Tests** (leanspec-http):
- [ ] PATCH `/api/specs/{spec}/metadata` updates and persists
- [ ] POST `/api/local-projects/discover` finds projects
- [ ] POST `/api/local-projects/list-directory` returns entries
- [ ] GET `/api/context` lists context files
- [ ] GET `/api/context/{file}` returns content
- [ ] POST `/api/projects/{id}/validate` validates correctly

**Error Handling**:
- [ ] Invalid spec paths return 404
- [ ] Invalid metadata values return 400
- [ ] Permission errors handled gracefully
- [ ] Malformed requests return proper errors

## Success Criteria

**Must Have**:
- [ ] All 6 endpoints implemented and functional
- [ ] Metadata editing works end-to-end
- [ ] Project discovery finds valid projects
- [ ] Directory listing works for project creation
- [ ] All tests passing
- [ ] Zero regressions in existing endpoints

**Should Have**:
- [ ] Performance: Metadata update < 50ms
- [ ] Performance: Discovery < 1s for typical home directory
- [ ] Comprehensive error messages
- [ ] Request/response examples in docs

## Notes

### Why This Order?

1. **Metadata update first**: Most critical, blocks editing
2. **Discovery next**: Required for onboarding flow
3. **Directory listing**: Completes project creation flow
4. **Context API**: Lower priority, enables context features
5. **Validation**: Polish, improves UX

### File Writing Safety

**Atomic writes critical** for metadata updates:
- Write to temporary file first
- Only rename on success
- Prevents corruption on crash/error
- Matches Next.js implementation behavior

### Related Specs

- [Spec 190](../190-ui-vite-parity-rust-backend/) - Parent umbrella spec
- [Spec 191](../191-rust-http-api-test-suite/) - API test suite (prerequisite)
- [Spec 193](../193-frontend-ui-parity/) - Frontend sub-spec (parallel work)
- [Spec 186](../186-rust-http-server/) - Original Rust HTTP server

## Implementation Log

### 2025-12-21: Parity Adjustments
- Contract tests revealed Rust currently exposes `/api/specs` while Next.js uses multi-project routes (`/api/projects/:projectId/specs` and `/api/projects/:projectId/specs/:specId`). Align Rust to the multi-project shape and return structures (`{ specs }`, `{ spec }`) expected by the Next.js API.
- Add missing endpoints: `/health` and `/api/search` (search can be stubbed or feature-flagged until implemented). Ensure response shapes match the contract suite once updated in spec 194.
- Remove deprecated flows from Rust (`/api/projects/:id/switch`, `/api/projects/refresh`) in favor of stateless project selection consistent with Next.js.
- Reconcile project schema differences (Next.js uses `displayName`, `specsDir`, single-project virtual project) so responses match the canonical schema decided with spec 194.

### 2025-12-19: Sub-Spec Created
- Split from parent spec 190
- Focus: Backend API endpoints only
- Depends on: Spec 191 (API tests)
- Parallel with: Spec 193 (Frontend)
- Estimated: 5 days
