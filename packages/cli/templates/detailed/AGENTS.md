# AI Agent Instructions

## Project: {project_name}

## 🚨 CRITICAL: Before ANY Task

**STOP and check these first:**

1. **Discover context** → Use `board` tool to see project state
2. **Search for related work** → Use `search` tool before creating new specs
3. **Never create files manually** → Always use `create` tool for new specs

> **Why?** Skipping discovery creates duplicate work. Manual file creation breaks LeanSpec tooling.

## 🔧 How to Manage Specs

### Primary Method: MCP Tools (Recommended)

If you have LeanSpec MCP tools available, **ALWAYS use them**:

| Action | MCP Tool | Description |
|--------|----------|-------------|
| See project status | `board` | Kanban view + project health metrics |
| List all specs | `list` | Filterable list with metadata |
| Search specs | `search` | Semantic search across all content |
| View a spec | `view` | Full content with formatting |
| Create new spec | `create` | Auto-sequences, proper structure |
| Update spec | `update` | Validates transitions, timestamps |
| Link specs | `link` | Add dependencies (depends_on) |
| Unlink specs | `unlink` | Remove dependencies |
| Check dependencies | `deps` | Visual dependency graph |

**Why MCP over CLI?**
- ✅ Direct tool integration (no shell execution needed)
- ✅ Structured responses (better for AI reasoning)
- ✅ Real-time validation (immediate feedback)
- ✅ Context-aware (understands project state)

### Fallback: CLI Commands

If MCP tools are not available, use CLI commands:

```bash
lean-spec board              # Project overview
lean-spec list               # See all specs
lean-spec search "query"     # Find relevant specs
lean-spec create <name>      # Create new spec
lean-spec update <spec> --status <status>  # Update status
lean-spec link <spec> --depends-on <other>   # Add dependencies
lean-spec unlink <spec> --depends-on <other> # Remove dependencies
lean-spec deps <spec>        # Show dependencies
```

**Tip:** Check if you have LeanSpec MCP tools available before using CLI.

## ⚠️ SDD Workflow Checkpoints

### Before Starting ANY Task

1. 📋 **Run `board`** - What's the current project state?
2. 🔍 **Run `search`** - Are there related specs already?
3. 📝 **Check existing specs** - Is there one for this work?

### During Implementation

4. 📊 **Update status to `in-progress`** BEFORE coding
5. 📝 **Document decisions** in the spec as you work
6. 🔗 **Link dependencies** if you discover blocking relationships

### After Completing Work

7. ✅ **Update status to `complete`** when done
8. 📄 **Document what you learned** in the spec
9. 🤔 **Create follow-up specs** if needed

### 🚫 Common Mistakes to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Create spec files manually | Use `create` tool |
| Skip discovery before new work | Run `board` and `search` first |
| Leave status as "planned" after starting | Update to `in-progress` immediately |
| Finish work without updating spec | Document decisions, update status |
| Edit frontmatter manually | Use `update` tool |
| Forget about specs mid-conversation | Check spec status periodically |

## Core Rules

1. **Read README.md first** - Understand project context
2. **Check specs/** - Review existing specs before starting
3. **Use MCP tools** - Prefer MCP over CLI when available
4. **Follow LeanSpec principles** - Clarity over documentation
5. **Keep it minimal** - If it doesn't add clarity, cut it
6. **NEVER manually edit frontmatter** - Use `update`, `link`, `unlink` tools
7. **Track progress in specs** - Update status and document decisions

## When to Use Specs

**Write a spec for:**
- Features affecting multiple parts of the system
- Breaking changes or significant refactors
- Design decisions needing team alignment

**Skip specs for:**
- Bug fixes
- Trivial changes
- Self-explanatory refactors

## Spec Dependencies

### `depends_on` - Blocking Dependency
Directional dependency - this spec cannot start until dependencies are complete.
**Use when:** True blocking dependency, work order matters, one spec builds on another.

```bash
lean-spec link <spec> --depends-on <other-spec>
```

**Note:** Only use `depends_on` for actual blocking dependencies. Don't link specs just because they're "related" - link them when one truly blocks the other.

## Quality Standards

- **Status tracking is mandatory:**
  - `planned` → after creation
  - `in-progress` → BEFORE starting implementation
  - `complete` → AFTER finishing implementation
- Specs stay in sync with implementation
- Never leave specs with stale status

## Spec Complexity Guidelines

| Tokens | Status |
|--------|--------|
| <2,000 | ✅ Optimal |
| 2,000-3,500 | ✅ Good |
| 3,500-5,000 | ⚠️ Consider splitting |
| >5,000 | 🔴 Should split |

Use `tokens` tool to check spec size.

---

**Remember:** LeanSpec tracks what you're building. Keep specs in sync with your work!
