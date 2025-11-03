---
status: complete
created: '2025-11-02'
tags:
  - feature
  - templates
  - cli
  - customization
priority: high
completed: '2025-11-02'
---

# Customization-First Template System

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-02 · **Tags**: feature, templates, cli, customization

## Overview

**Core Principle**: LeanSpec's whole purpose is to ensure full control for users over the SDD process with AI agents. Customization must be a first-class citizen, not an afterthought.

**Current Problem**: Templates are locked in the npm package. Users cannot customize spec templates, frontmatter fields, variables, or template directory structure without modifying package files (which are lost on updates).

**Solution**: Invert the architecture - templates live in the user's project (`.lspec/templates/`), not the npm package. Package templates become initialization starters only.

## Current Architecture (Template-Centric) ❌

```
npm package (read-only)
└── templates/
    ├── minimal/
    ├── standard/
    └── enterprise/

User's project
└── .lspec/
    └── config.json   # Only stores template name reference
```

**Problems:**
- Templates in npm package are immutable
- No way to add custom templates
- No way to customize spec structure
- Users don't own their workflow

## New Architecture (User-Centric) ✅

```
User's project
└── .lspec/
    ├── config.json
    └── templates/
        ├── spec-template.md      # Default (copied from npm on init)
        ├── api-spec.md           # User's custom API template
        ├── rfc.md                # User's custom RFC template
        └── ...                   # Any custom templates

npm package (initialization only)
└── templates/
    ├── minimal/
    ├── standard/
    └── enterprise/
```

**Benefits:**
- ✅ Users own and control all templates
- ✅ Can customize immediately after init
- ✅ Can add unlimited custom templates
- ✅ Templates are versioned with project
- ✅ No dependency on npm package structure
- ✅ True customization-first

## Design

### 1. Template Lifecycle

**Phase 1: Initialization (`lspec init`)**
```bash
lspec init
# User chooses template: minimal/standard/enterprise
# Template copied from npm package to .lspec/templates/spec-template.md
# User immediately has full control
```

**Phase 2: Customization (User's choice)**
```bash
# Edit default template
vim .lspec/templates/spec-template.md

# Add custom templates
cp .lspec/templates/spec-template.md .lspec/templates/api-spec.md
# Edit api-spec.md for API-specific structure

# Register in config
lspec templates add api api-spec.md
```

**Phase 3: Usage**
```bash
# Use default template
lspec create my-feature

# Use custom template
lspec create my-api --template=api
```

### 2. Enhanced Config Structure

```json
{
  "template": "spec-template.md",
  "templates": {
    "default": "spec-template.md",
    "api": "api-spec.md",
    "rfc": "rfc.md"
  },
  "specsDir": "specs",
  "structure": {
    "pattern": "{date}/{seq}-{name}/",
    "dateFormat": "YYYYMMDD",
    "sequenceDigits": 3,
    "defaultFile": "README.md"
  },
  "frontmatter": {
    "required": ["status", "created"],
    "optional": ["tags", "priority", "assignee", "reviewer"],
    "custom": {
      "epic": "string",
      "sprint": "number",
      "estimate": "string",
      "milestone": "string"
    }
  },
  "variables": {
    "project_name": "my-project",
    "team": "platform",
    "author": "${git_user}",
    "repo": "${git_repo}"
  }
}
```

### 3. New Commands

```bash
# List available templates in project
lspec templates list

# Add/register a template
lspec templates add <name> <file>
# Example: lspec templates add api api-spec.md

# Show template content
lspec templates show <name>

# Remove template
lspec templates remove <name>

# Copy existing template as starting point
lspec templates copy <source> <target>
# Example: lspec templates copy default api-spec
```

### 4. Template Resolution

**In `create.ts`:**

```typescript
async function resolveTemplate(
  templateName: string | undefined, 
  config: LeanSpecConfig, 
  cwd: string
): Promise<string> {
  const templatesDir = path.join(cwd, '.lspec', 'templates');
  
  // 1. Check for --template flag
  if (templateName && config.templates?.[templateName]) {
    const templateFile = config.templates[templateName];
    const templatePath = path.join(templatesDir, templateFile);
    
    try {
      await fs.access(templatePath);
      return templatePath;
    } catch {
      console.error(chalk.red(`Template not found: ${templateName}`));
      console.error(chalk.gray(`Looking for: ${templatePath}`));
      console.error(chalk.gray(`Available templates: ${Object.keys(config.templates || {}).join(', ')}`));
      process.exit(1);
    }
  }
  
  // 2. Use default template from config
  const defaultTemplate = config.template || 'spec-template.md';
  const defaultPath = path.join(templatesDir, defaultTemplate);
  
  try {
    await fs.access(defaultPath);
    return defaultPath;
  } catch {
    // Error - templates should exist after init
    console.error(chalk.red('No templates found!'));
    console.error(chalk.gray('Expected: .lspec/templates/spec-template.md'));
    console.error(chalk.yellow('Run: lspec init'));
    process.exit(1);
  }
}
```

### 5. Custom Frontmatter Support

**Extend frontmatter parser to support custom fields:**

```typescript
interface FrontmatterConfig {
  required: string[];
  optional: string[];
  custom?: Record<string, 'string' | 'number' | 'boolean' | 'array'>;
}

// Validate and parse custom fields
function parseCustomFrontmatter(
  frontmatter: Record<string, any>,
  config: FrontmatterConfig
): Record<string, any> {
  const custom: Record<string, any> = {};
  
  if (config.custom) {
    for (const [key, type] of Object.entries(config.custom)) {
      if (key in frontmatter) {
        // Type validation and coercion
        custom[key] = coerceType(frontmatter[key], type);
      }
    }
  }
  
  return custom;
}
```

**Usage:**
```bash
# Create with custom frontmatter
lspec create my-feature --epic=PLAT-123 --sprint=42

# Update custom fields
lspec update specs/20251102/001-my-feature --epic=PLAT-456
```

### 6. Variable Substitution System

**Built-in variables:**
- `{name}` - Spec name
- `{date}` - Creation date
- `{project_name}` - From package.json or config
- `{author}` - From git config
- `{git_user}` - Git username
- `{git_repo}` - Git repository name
- `{team}` - From config

**Custom variables from config:**
```json
{
  "variables": {
    "company": "Acme Corp",
    "department": "Platform Engineering",
    "default_reviewer": "alice"
  }
}
```

**In templates:**
```markdown
---
status: planned
created: {date}
assignee: {author}
reviewer: {default_reviewer}
epic: {epic}
---

# {name}

**Project**: {project_name}  
**Team**: {team}  
**Company**: {company}

...
```

## Implementation Plan

### Phase 1: Core Template System (Week 1)
- [ ] Create `.lspec/templates/` directory on init
- [ ] Copy chosen template to `.lspec/templates/spec-template.md`
- [ ] Update `create.ts` to use project templates (remove package fallback)
- [ ] Implement template resolution logic
- [ ] Update `init.ts` to set up templates directory

### Phase 2: Template Management (Week 1)
- [ ] Implement `lspec templates list` command
- [ ] Implement `lspec templates add <name> <file>` command
- [ ] Implement `lspec templates show <name>` command
- [ ] Implement `lspec templates copy <source> <target>` command
- [ ] Implement `lspec templates remove <name>` command
- [ ] Add `--template` flag to `create` command

### Phase 3: Custom Frontmatter (Week 2)
- [ ] Extend config.json schema with `frontmatter.custom`
- [ ] Update frontmatter parser to handle custom fields
- [ ] Add validation and type coercion
- [ ] Support custom fields in `create` command
- [ ] Support custom fields in `update` command
- [ ] Update `list` command to show custom fields

### Phase 4: Variable System (Week 2)
- [ ] Implement built-in variable resolution
- [ ] Support custom variables from config
- [ ] Add git integration for author/repo variables
- [ ] Apply variables during template rendering
- [ ] Document all available variables

### Phase 5: Documentation & Dogfooding (Week 2)
- [ ] Update README.md with customization examples
- [ ] Update AGENTS.md with template customization workflow
## Test Cases

### Template Resolution
- [ ] Uses project template when exists
- [ ] Errors when template missing (no fallback)
- [ ] Resolves --template flag correctly
- [ ] Errors gracefully with helpful message when template not found

### Template Management
- [ ] `templates list` shows all project templates
- [ ] `templates add` registers new template
- [ ] `templates copy` creates copy with new name
- [ ] `templates remove` unregisters template
- [ ] Config stays in sync with template commands

### Custom Frontmatter
- [ ] Parses custom fields from config
- [ ] Validates field types
- [ ] Accepts custom fields in create command
- [ ] Updates custom fields in update command
- [ ] Lists specs with custom fields

### Variables
- [ ] Substitutes built-in variables
- [ ] Substitutes custom variables from config
- [ ] Resolves git variables correctly
- [ ] Handles missing variables gracefully

### Init Process
- [ ] Creates .lspec/templates/ directory
- [ ] Copies chosen template to spec-template.md
- [ ] Sets up config with templates section
- [ ] Works with merge/backup/skip for AGENTS.md

## Breaking Changes

**This is a breaking change** - but since lean-spec is new and only dogfooding itself, this is acceptable.

**What breaks:**
- Projects initialized with old version will have no `.lspec/templates/`
- `lspec create` will fail with clear error message
- Solution: Run `lspec init` again or manually create templates directory

**Migration for lean-spec itself:**
1. Create `.lspec/templates/` directory
2. Copy current package template to `.lspec/templates/spec-template.md`
3. Update config to include templates section
4. Test creating new specstinuing with: lspec create my-feature
```

**Manual migration:**
```bash
lspec templates migrate
```

## Non-Goals (for v1)

- Template inheritance/composition system
- Template marketplace or sharing
- Template validation/linting tools
- Visual template editor
- Template versioning system
- Hot-reloading of templates
- Backward compatibility with pre-templates projects

These can be added later based on user feedback.ly after init
- ✅ Users can add unlimited custom templates
- ✅ Users can define custom frontmatter fields
- ✅ Users can define custom variables
- ✅ Zero breaking changes for existing projects
- ✅ Documentation clearly shows customization options

## Notes

**Why this is critical:**

LeanSpec's entire value proposition is about **giving users control** over their SDD process. If templates are locked in npm packages, we're contradicting our core principle. This redesign makes customization the default, not an advanced feature.

**Philosophy alignment:**

> "LeanSpec is a mindset. Adapt these guidelines to what actually helps."

This only works if users can actually adapt the system. Moving templates to `.lspec/templates/` makes customization tangible and discoverable.

**Learning from other tools:**
- **Next.js**: `eject` is available but discouraged (creates maintenance burden)
- **Create React App**: Same - eject is one-way, creates complexity
- **Prettier/Tailwind**: Configs in project - users have full control ✅

We should follow the Prettier/Tailwind model: sensible defaults, full customization in user's project.
