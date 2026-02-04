---
name: create
description: Create a new spec following SDD workflow
---

# Create Spec

Create a new spec following the Spec-Driven Development workflow.

## Workflow

### 1. Discovery First (Required)
Before creating any spec, always check for existing related work:
- Use `board` to see current project state and identify gaps
- Use `search "relevant keywords"` to find related specs
- If similar spec exists, consider extending it or linking as dependency

### 2. Gather Requirements
Extract from the user's request:
- **Problem/Goal**: What needs to be solved or achieved?
- **Scope**: What's in and out of scope?
- **Success Criteria**: How do we know it's done?
- **Dependencies**: What needs to exist first?

### 3. Create the Spec

**Use the create tool/command:**
Use MCP tool: `create` (Preferable)

Or CLI command:
```bash
lean-spec create "spec-name"
```

**Spec naming conventions:**
- Use kebab-case: `feature-name-description`
- Be descriptive but concise: `user-auth-oauth-integration`
- Avoid generic names: prefer `fix-search-pagination` over `bug-fix`

### 4. Write Quality Content

**Essential sections:**

1. **Overview** (1-3 sentences)
   - What problem does this solve?
   - Why is it important?

2. **Requirements** (checklist format)
   - Use `- [ ]` for actionable items
   - Each item should be independently verifiable
   - Group by logical sections with headers

3. **Non-Goals** (what we explicitly won't do)
   - Prevents scope creep
   - Clarifies boundaries

4. **Technical Notes** (optional)
   - Architecture decisions
   - File references
   - API considerations

5. **Acceptance Criteria**
   - Measurable success conditions
   - Test scenarios if applicable

### 5. Link Relationships

**Types of relationships:**

| Type | When to Use |
|------|-------------|
| Parent | This spec is part of a larger umbrella spec |
| Depends On | This spec needs another spec done first |

**Commands:**
```bash
lean-spec link <spec> --parent <umbrella-spec>
lean-spec link <spec> --depends-on <blocking-spec>
```

### 6. Validate

Run validation to check spec quality:
```bash
lean-spec validate
```

**Validation checks:**
- Token count (keep under 2000 tokens)
- Required sections present
- Checklist items properly formatted
- Dependencies are valid

## Quick Reference

| Action | MCP Tool | CLI Command |
|--------|----------|-------------|
| View board | `board` | `lean-spec board` |
| Search specs | `search` | `lean-spec search "query"` |
| Create spec | `create` | `lean-spec create <name>` |
| Link parent | `link` | `lean-spec link <spec> --parent <parent>` |
| Add dependency | `link` | `lean-spec link <spec> --depends-on <dep>` |
| Check tokens | `tokens` | `lean-spec tokens <spec>` |
| Validate | `validate` | `lean-spec validate` |

## Important Reminders

- **Search first** - Never create duplicates; link related specs instead
- **Keep it concise** - Target under 2000 tokens; split large specs
- **Checkboxes only for actions** - Use plain lists for non-actionable items
- **Link dependencies early** - Prevents blocked work
- **No manual frontmatter** - Use tools to manage status, tags, etc.
- **Parent vs Depends-on**: Use parent for decomposition, depends-on for blocking