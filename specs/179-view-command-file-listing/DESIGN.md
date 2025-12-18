# Design: Add File Listing to View Command

## Current Output Format

**CLI View (JSON):**
```json
{
  "path": "018-spec-validation",
  "title": "Comprehensive Spec Validation",
  "status": "complete",
  "created": "2025-11-02",
  "priority": "critical",
  "tags": ["quality", "validation", "cli"],
  "depends_on": ["012-sub-spec-files"],
  "assignee": null,
  "content": "# Comprehensive Spec Validation\n..."
}
```

## Proposed Output Format

Add `files` array listing all markdown files in the spec directory:

```json
{
  "path": "018-spec-validation",
  "title": "Comprehensive Spec Validation",
  "status": "complete",
  "created": "2025-11-02",
  "priority": "critical",
  "tags": ["quality", "validation", "cli"],
  "depends_on": ["012-sub-spec-files"],
  "assignee": null,
  "files": [
    "README.md",
    "CLI-DESIGN.md",
    "CONFIGURATION-EXAMPLES.md",
    "CONFIGURATION.md",
    "IMPLEMENTATION.md",
    "TESTING.md",
    "VALIDATION-RULES.md"
  ],
  "content": "# Comprehensive Spec Validation\n..."
}
```

## Implementation Changes

### 1. Update Rust Core

**File**: `rust/leanspec-core/src/types/spec.rs`

Add `files` field to `SpecInfo` struct:

```rust
pub struct SpecInfo {
    pub path: String,
    pub title: String,
    pub frontmatter: SpecFrontmatter,
    pub content: String,
    pub file_path: std::path::PathBuf,
    pub is_sub_spec: bool,
    pub parent_spec: Option<String>,
    pub files: Vec<String>,  // ✅ New field
}
```

### 2. Update Spec Loader

**File**: `rust/leanspec-core/src/utils/spec_loader.rs`

Add method to list files and populate in loader:

```rust
impl SpecLoader {
    fn list_spec_files(&self, spec_dir: &Path) -> Result<Vec<String>> {
        let mut files = Vec::new();
        
        for entry in std::fs::read_dir(spec_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && path.extension().map(|e| e == "md").unwrap_or(false) {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    files.push(name.to_string());
                }
            }
        }
        
        // Sort with README.md first
        files.sort_by(|a, b| {
            match (a.as_str(), b.as_str()) {
                ("README.md", _) => std::cmp::Ordering::Less,
                (_, "README.md") => std::cmp::Ordering::Greater,
                (a, b) => a.cmp(b),
            }
        });
        
        Ok(files)
    }
    
    pub fn load(&self, spec_path: &str) -> Result<Option<SpecInfo>> {
        // ... existing code ...
        
        let files = self.list_spec_files(&spec_dir)?;
        
        Ok(Some(SpecInfo {
            // ... existing fields ...
            files,  // ✅ Include files
        }))
    }
}
```

### 3. Update CLI View Command

**File**: `rust/leanspec-cli/src/commands/view.rs`

```rust
pub fn run(specs_dir: &str, spec_path: &str, output: &str) -> Result<()> {
    let loader = SpecLoader::new(specs_dir);
    let spec = loader.load(spec_path)?.ok_or("Spec not found")?;
    
    if output == "json" {
        let json = json!({
            "path": spec.path,
            "title": spec.title,
            "status": spec.frontmatter.status.to_string(),
            "created": spec.frontmatter.created,
            "priority": spec.frontmatter.priority,
            "tags": spec.frontmatter.tags,
            "depends_on": spec.frontmatter.depends_on,
            "assignee": spec.frontmatter.assignee,
            "files": spec.files,  // ✅ Include files
            "content": spec.content,
        });
        println!("{}", serde_json::to_string_pretty(&json)?);
    } else {
        // Text output
        println!("Files: {} file(s)", spec.files.len());
        for file in &spec.files {
            println!("  📄 {}", file);
        }
        // ... rest of output
    }
    
    Ok(())
}
```

### 4. Update MCP View Tool

**File**: `rust/leanspec-mcp/src/tools.rs`

```rust
fn tool_view(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args.get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;
    
    let loader = SpecLoader::new(specs_dir);
    let spec = loader.load(spec_path).map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;
    
    let output = json!({
        "path": spec.path,
        "title": spec.title,
        "status": spec.frontmatter.status.to_string(),
        "created": spec.frontmatter.created,
        "priority": spec.frontmatter.priority.map(|p| p.to_string()),
        "tags": spec.frontmatter.tags,
        "depends_on": spec.frontmatter.depends_on,
        "assignee": spec.frontmatter.assignee,
        "files": spec.files,  // ✅ Include files
        "content": spec.content,
    });
    
    serde_json::to_string_pretty(&output).map_err(|e| e.to_string())
}
```

## Backwards Compatibility

- **CLI `files` command**: Keep as-is, no changes needed
- **CLI `view` JSON**: Adding `files` array is non-breaking (clients ignore unknown fields)
- **MCP `view` tool**: Adding `files` array is non-breaking
- **Sorting**: README.md always appears first for consistency
