---
status: in-progress
created: '2025-11-02'
tags:
  - enhancement
  - frontmatter
  - customization
priority: high
milestone: v0.2.0
---

# complete-custom-frontmatter

> **Status**: 🔨 In progress · **Priority**: High · **Created**: 2025-11-02 · **Tags**: enhancement, frontmatter, customization

## Overview

Complete the custom frontmatter and variable substitution system outlined in spec 001-custom-spec-templates. The template system foundation is done, but the advanced customization features (custom fields, variables) are not yet implemented.

**Current State:**
- ✅ Templates moved to `.lspec/templates/`
- ✅ Template management commands implemented
- ❌ Custom frontmatter fields from config not implemented
- ❌ Variable substitution system not implemented
- ❌ Git-based variables not implemented

**Why Now:**
This was the core promise of the customization-first redesign. Without these features, users can customize templates manually but lose metadata filtering and dynamic content generation.

## Design

### 1. Custom Frontmatter Fields

Extend `.lspec/config.json`:
```json
{
  "frontmatter": {
    "required": ["status", "created"],
    "optional": ["tags", "priority", "assignee"],
    "custom": {
      "epic": "string",
      "sprint": "number",
      "estimate": "string",
      "issue": "string",
      "reviewer": "string"
    }
  }
}
```

**Implementation:**
- Parse `custom` fields from config
- Validate types during spec creation/update
- Support in `list` and `search` commands for filtering
- Display custom fields in output

### 2. Variable Substitution System

Support variables in templates:
```markdown
---
status: planned
created: {date}
assignee: {author}
reviewer: {default_reviewer}
---

# {name}

**Project**: {project_name}
**Author**: {git_user}
```

**Built-in Variables:**
- `{name}` - Spec name
- `{date}` - Creation date (ISO format)
- `{project_name}` - From package.json or config
- `{author}` - From git config user.name
- `{git_user}` - Git username
- `{git_repo}` - Repository name

**Custom Variables (from config):**
```json
{
  "variables": {
    "team": "Platform Engineering",
    "default_reviewer": "alice",
    "company": "Acme Corp"
  }
}
```

### 3. Git Integration

Add utility to extract git information:
```typescript
async function getGitInfo(): Promise<{
  user: string;
  email: string;
  repo: string;
}> {
  // Execute git commands to get user.name, user.email, remote.origin.url
}
```

## Plan

### Phase 1: Custom Frontmatter (Week 1)
- [ ] Update config schema with `frontmatter.custom` support
- [ ] Extend frontmatter parser to handle custom fields
- [ ] Add type validation and coercion (string, number, boolean, array)
- [ ] Update `create` command to accept custom fields via flags
- [ ] Update `update` command to modify custom fields
- [ ] Update `list` command to display custom fields
- [ ] Update `search` command to filter by custom fields
- [ ] Add tests for custom frontmatter parsing and validation

### Phase 2: Variable System (Week 1)
- [ ] Create variable resolver utility
- [ ] Implement built-in variables (`name`, `date`, `project_name`)
- [ ] Add git integration for `author`, `git_user`, `git_repo`
- [ ] Support custom variables from config
- [ ] Apply variable substitution during template rendering
- [ ] Add tests for variable resolution
- [ ] Handle missing variables gracefully (warning, not error)

### Phase 3: Integration & Polish (Week 1)
- [ ] Test custom frontmatter + variables together
- [ ] Update documentation (README, examples)
- [ ] Update AGENTS.md with customization instructions
- [ ] Create example configs for common use cases
- [ ] Dogfood on lean-spec itself (add epic, issue fields)
- [ ] Update init templates to show example custom fields

## Test

### Custom Frontmatter
- [ ] Parse custom fields from config correctly
- [ ] Validate field types (reject invalid types)
- [ ] Accept custom fields in `create --epic=FOO-123`
- [ ] Update custom fields via `update --issue=GH-456`
- [ ] Filter by custom fields in `list --epic=FOO-123`
- [ ] Display custom fields in list output
- [ ] Handle missing custom fields gracefully

### Variable Substitution
- [ ] Substitute `{name}` correctly in templates
- [ ] Substitute `{date}` with ISO format
- [ ] Load `{project_name}` from package.json
- [ ] Extract `{author}` from git config
- [ ] Extract `{git_repo}` from git remote
- [ ] Apply custom variables from config
- [ ] Handle missing variables without crashing
- [ ] Nested variable references work (or explicitly not supported)

### Integration
- [ ] Custom frontmatter + variables work together
- [ ] Init process creates example config with custom fields
- [ ] Works with all templates (minimal, standard, enterprise)

## Notes

**Dependencies:**
- Builds on spec 001-custom-spec-templates foundation
- Requires no changes to core architecture

**Breaking Changes:**
- None - this is purely additive

**Reference Implementation:**
See spec 001-custom-spec-templates Phase 3 & 4 for detailed design.

**Priority Justification:**
High priority because this completes the customization promise. Without it, the template system redesign feels incomplete.
