---
status: in-progress
created: 2025-12-18
priority: high
tags:
- bug
- rust
- mcp
- cli
- templates
depends_on:
- 176-rust-mcp-server-test-suite
created_at: 2025-12-18T06:02:54.117601297Z
updated_at: 2025-12-18T06:03:00.359725293Z
---

# Fix Rust MCP/CLI to Load Templates from .lean-spec/templates

> **Status**: ⏳ In-progress · **Created**: 2025-12-18 · **Priority**: High · **Tags**: bug, rust, mcp, cli, templates

## Overview

**Problem**: The Rust MCP server and CLI currently hardcode spec templates in `generate_spec_content()` functions instead of loading them from the `.lean-spec/templates/` directory. This means:
- User template customizations are ignored
- Rust implementation is inconsistent with TypeScript implementation
- Cannot use `--template` flag with custom templates
- Template management commands (`lean-spec templates`) are disconnected from spec creation

**Value**: Fixing template loading ensures feature parity between Rust and TypeScript implementations, enables template customization, and makes the Rust version production-ready.

## Current Behavior

### Rust CLI (`rust/leanspec-cli/src/commands/create.rs`)
```rust
pub fn run(
    specs_dir: &str,
    name: &str,
    title: Option<String>,
    _template: Option<String>,  // ⚠️ Ignored!
    status: &str,
    priority: Option<String>,
    tags: Option<String>,
) -> Result<(), Box<dyn Error>> {
    // ...
    let content = generate_spec_content(&title, status, priority.as_deref(), &tags_vec);
    // ⚠️ Hardcoded template, ignores .lean-spec/templates/
}

fn generate_spec_content(...) -> String {
    // ⚠️ Hardcoded template structure
    format!(r#"{}
# {}

> **Status**: {} {} · **Created**: {}{}{}

## Overview
_Describe the problem being solved..._
"#, frontmatter, title, status_emoji, ...)
}
```

### Rust MCP (`rust/leanspec-mcp/src/tools.rs`)
```rust
fn tool_create(specs_dir: &str, args: Value) -> Result<String, String> {
    // ...
    let content = generate_spec_content(&title, status, priority, &tags);
    // ⚠️ Hardcoded template
}

fn generate_spec_content(...) -> String {
    // ⚠️ Same hardcoded template as CLI
}
```

### Expected Behavior (TypeScript implementation)
```typescript
// packages/cli/src/commands/create.ts
const templatesDir = path.join(cwd, '.lean-spec', 'templates');
let templateName = options.template 
  ? config.templates[options.template]
  : config.template || 'spec-template.md';

let templatePath = path.join(templatesDir, templateName);
const template = await fs.readFile(templatePath, 'utf-8');  // ✅ Loads from filesystem
```

## Design

### 1. Add Template Loading to Rust Core

Create `rust/leanspec-core/src/utils/template_loader.rs`:

```rust
pub struct TemplateLoader {
    templates_dir: PathBuf,
    config: Option<LeanSpecConfig>,
}

impl TemplateLoader {
    pub fn new(project_root: &Path) -> Self {
        Self {
            templates_dir: project_root.join(".lean-spec").join("templates"),
            config: None,
        }
    }
    
    pub fn with_config(project_root: &Path, config: LeanSpecConfig) -> Self {
        Self {
            templates_dir: project_root.join(".lean-spec").join("templates"),
            config: Some(config),
        }
    }
    
    /// Load template content by name
    pub fn load(&self, template_name: Option<&str>) -> Result<String, TemplateError> {
        let template_name = template_name
            .or_else(|| self.config.as_ref()?.default_template.as_deref())
            .unwrap_or("spec-template.md");
        
        let template_path = self.templates_dir.join(template_name);
        
        // Try template path
        if template_path.exists() {
            return self.load_from_path(&template_path);
        }
        
        // Fallback: try spec-template.md
        let fallback = self.templates_dir.join("spec-template.md");
        if fallback.exists() {
            return self.load_from_path(&fallback);
        }
        
        // Fallback: try README.md
        let readme = self.templates_dir.join("README.md");
        if readme.exists() {
            return self.load_from_path(&readme);
        }
        
        Err(TemplateError::NotFound(template_name.to_string()))
    }
    
    fn load_from_path(&self, path: &Path) -> Result<String, TemplateError> {
        if path.is_dir() {
            // Directory template - load README.md
            let readme = path.join("README.md");
            std::fs::read_to_string(&readme)
                .map_err(|e| TemplateError::ReadError(e.to_string()))
        } else {
            // File template
            std::fs::read_to_string(path)
                .map_err(|e| TemplateError::ReadError(e.to_string()))
        }
    }
    
    /// List available templates
    pub fn list(&self) -> Result<Vec<String>, TemplateError> {
        // Implementation
    }
}
```

### 2. Add Variable Substitution

Support template variables like `{{title}}`, `{{date}}`, `{{name}}`:

```rust
pub fn resolve_variables(template: &str, context: &VariableContext) -> String {
    let mut content = template.to_string();
    
    content = content.replace("{{title}}", &context.title);
    content = content.replace("{{name}}", &context.name);
    content = content.replace("{{date}}", &context.date);
    content = content.replace("{{created}}", &context.date);
    
    content
}

pub struct VariableContext {
    pub title: String,
    pub name: String,
    pub date: String,
}
```

### 3. Update CLI Create Command

```rust
// rust/leanspec-cli/src/commands/create.rs
pub fn run(
    specs_dir: &str,
    name: &str,
    title: Option<String>,
    template: Option<String>,  // ✅ Now used!
    status: &str,
    priority: Option<String>,
    tags: Option<String>,
) -> Result<(), Box<dyn Error>> {
    // Load config and template
    let project_root = find_project_root(Path::new(specs_dir))?;
    let config = LeanSpecConfig::load(&project_root)?;
    let template_loader = TemplateLoader::with_config(&project_root, config);
    
    // Load template from filesystem
    let template_content = template_loader.load(template.as_deref())?;
    
    // Build variable context
    let title = title.unwrap_or_else(|| name_to_title(name));
    let context = VariableContext {
        title: title.clone(),
        name: name.to_string(),
        date: Utc::now().format("%Y-%m-%d").to_string(),
    };
    
    // Resolve variables
    let content = resolve_variables(&template_content, &context);
    
    // Update frontmatter with CLI options
    let content = update_frontmatter(content, status, priority.as_deref(), &tags_vec)?;
    
    // Write file
    fs::write(&readme_path, &content)?;
}
```

### 4. Update MCP Create Tool

```rust
// rust/leanspec-mcp/src/tools.rs
fn tool_create(specs_dir: &str, args: Value) -> Result<String, String> {
    // Load template from filesystem (same as CLI)
    let project_root = find_project_root(Path::new(specs_dir))
        .map_err(|e| e.to_string())?;
    let config = LeanSpecConfig::load(&project_root)
        .unwrap_or_default();
    let template_loader = TemplateLoader::with_config(&project_root, config);
    
    let template_name = args.get("template").and_then(|v| v.as_str());
    let template_content = template_loader.load(template_name)
        .map_err(|e| e.to_string())?;
    
    // ... rest of implementation
}
```

## Plan

- [x] Create spec to track issue
- [ ] Add `template_loader.rs` to `rust/leanspec-core/src/utils/`
- [ ] Implement `TemplateLoader` struct with load methods
- [ ] Add variable resolution logic
- [ ] Update CLI `create.rs` to use `TemplateLoader`
- [ ] Update MCP `tools.rs` `tool_create` to use `TemplateLoader`
- [ ] Add helper to find project root from specs directory
- [ ] Add tests for template loading
- [ ] Add tests for variable resolution
- [ ] Test with custom templates
- [ ] Test with directory templates (multi-file)

## Test

### Template Loading
- [ ] Loads from `.lean-spec/templates/spec-template.md` by default
- [ ] Loads custom template with `--template` flag
- [ ] Falls back to `spec-template.md` if named template not found
- [ ] Falls back to `README.md` if no spec-template.md exists
- [ ] Handles directory templates (reads README.md from directory)
- [ ] Returns error if no templates exist

### Variable Resolution
- [ ] Replaces `{{title}}` with spec title
- [ ] Replaces `{{name}}` with spec name
- [ ] Replaces `{{date}}` with current date
- [ ] Replaces `{{created}}` with current date
- [ ] Leaves unrecognized variables unchanged

### Integration
- [ ] CLI creates spec with custom template
- [ ] MCP creates spec with custom template
- [ ] Frontmatter from template is preserved
- [ ] CLI options (status, priority, tags) override template defaults
- [ ] Works with existing `.lean-spec/templates/` directory

## Notes

**Root Cause**: Both Rust implementations were ported from early TypeScript code that also hardcoded templates. The TS version was later refactored to support template loading, but the Rust ports retained the original hardcoded approach.

**Breaking Change**: None - this is backward compatible. If no `.lean-spec/templates/` exists, return a helpful error message.

**Reference Implementation**: `packages/cli/src/commands/create.ts` lines 160-220

**Related Specs:**
- See [179-view-command-file-listing](../179-view-command-file-listing) for adding file lists to `view` output

### MCP Tool Parity Status

**Current Rust MCP Tools (12)**: list, view, create, update, validate, deps, link, unlink, search, board, tokens, stats

**Not Yet Ported (intentional - will add when needed)**:
- `files` - List files in spec directory → **Tracked in spec 179** (will embed in `view` output)
- `agent` - Dispatch to AI coding agents → **Will add later when agent workflow is mature**
- `archive` - Archive specs → Lower priority, manual workflow OK for now
- `backfill` - Backfill git metadata → One-time migration tool, not needed in MCP
- `check` - Check sequence conflicts → One-time validation, not core workflow
- `analyze` - Analyze complexity → Covered by `validate` tool
- `gantt`/`timeline` - Visualization → Better suited for UI, not MCP

**Decision**: Keep MCP focused on core spec management operations that AI agents need frequently. Utility/one-time commands stay CLI-only.
