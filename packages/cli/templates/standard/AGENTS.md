# AI Agent Instructions

## Project: {project_name}

## 🚨 CRITICAL: Before ANY Task

**STOP and check these first:**

1. **Discover context** → Use `board` tool to see project state
2. **Search for related work** → Use `search` tool before creating new specs
3. **Never create files manually** → Always use `create` tool for new specs

> **Why?** Skipping discovery creates duplicate work. Manual file creation breaks LeanSpec tooling.

## 🔧 Managing Specs

### MCP Tools (Preferred) with CLI Fallback

| Action | MCP Tool | CLI Fallback |
|--------|----------|--------------|
| Project status | `board` | `leanspec board` |
| List specs | `list` | `leanspec list` |
| Search specs | `search` | `leanspec search "query"` |
| View spec | `view` | `leanspec view <spec>` |
| Create spec | `create` | `leanspec create <name>` |
| Update spec | `update` | `leanspec update <spec> --status <status>` |
| Link specs | `link` | `leanspec link <spec> --depends-on <other>` |
| Unlink specs | `unlink` | `leanspec unlink <spec> --depends-on <other>` |
| Dependencies | `deps` | `leanspec deps <spec>` |
| Token count | `tokens` | `leanspec tokens <spec>` |
| Validate specs | `validate` | `leanspec validate` |

## ⚠️ Core Rules

| Rule | Details |
|------|---------|
| **NEVER edit frontmatter manually** | Use `update`, `link`, `unlink` for: `status`, `priority`, `tags`, `assignee`, `transitions`, timestamps, `depends_on` |
| **ALWAYS link spec references** | Content mentions another spec → `leanspec link <spec> --depends-on <other>` |
| **Track status transitions** | `draft` → `planned` → `in-progress` (before coding) → `complete` (after done) |
| **Keep specs current** | Document progress, decisions, and learnings as work happens. Obsolete specs mislead both humans and AI |
| **No nested code blocks** | Use indentation instead |

### 🚫 Common Mistakes

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Create spec files manually | Use `create` tool |
| Skip discovery | Run `board` and `search` first |
| Leave status as "draft" or "planned" | Update to `in-progress` before coding |
| Edit frontmatter manually | Use `update` tool |
| Complete spec without documentation | Document progress, prompts, learnings first |

## 📋 SDD Workflow

```
BEFORE: board → search → check existing specs
DURING: update status to in-progress → code → document decisions → link dependencies
AFTER:  document completion → update status to complete
```

**Status tracks implementation, NOT spec writing.**

## Spec Dependencies

Use `depends_on` to express blocking relationships between specs:
- **`depends_on`** = True blocker, work order matters, directional (A depends on B)

Link dependencies when one spec builds on another:
```bash
leanspec link <spec> --depends-on <other-spec>
```

## When to Use Specs

| ✅ Write spec | ❌ Skip spec |
|---------------|--------------|
| Multi-part features | Bug fixes |
| Breaking changes | Trivial changes |
| Design decisions | Self-explanatory refactors |

## Token Thresholds

| Tokens | Status |
|--------|--------|
| <2,000 | ✅ Optimal |
| 2,000-3,500 | ✅ Good |
| 3,500-5,000 | ⚠️ Consider splitting |
| >5,000 | 🔴 Must split |

## Quality Validation

Before completing work, validate spec quality:
```bash
leanspec validate              # Check structure and quality
leanspec validate --check-deps # Verify dependency alignment
```

Validation checks:
- Missing required sections
- Excessive length (>400 lines)
- Content/frontmatter dependency misalignment
- Invalid frontmatter fields

## First Principles (Priority Order)

1. **Context Economy** - <2,000 tokens optimal, >3,500 needs splitting
2. **Signal-to-Noise** - Every word must inform a decision
3. **Intent Over Implementation** - Capture why, let how emerge
4. **Bridge the Gap** - Both human and AI must understand
5. **Progressive Disclosure** - Add complexity only when pain is felt

---

**Remember:** LeanSpec tracks what you're building. Keep specs in sync with your work!