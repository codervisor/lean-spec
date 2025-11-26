# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## 🚨 CRITICAL: Before ANY Task

1. **Discover** → `board` or `lean-spec board` to see project state
2. **Search** → `search` or `lean-spec search` before creating new specs  
3. **Never create files manually** → Always use `create` tool or `lean-spec create`

## 🔧 Managing Specs

### MCP Tools (Preferred) with CLI Fallback

| Action | MCP Tool | CLI Fallback |
|--------|----------|--------------|
| Project status | `board` | `lean-spec board` |
| List specs | `list` | `lean-spec list` |
| Search specs | `search` | `lean-spec search "query"` |
| View spec | `view` | `lean-spec view <spec>` |
| Create spec | `create` | `lean-spec create <name>` |
| Update spec | `update` | `lean-spec update <spec> --status <status>` |
| Dependencies | `deps` | `lean-spec deps <spec>` |
| Token count | `tokens` | `lean-spec tokens <spec>` |

**Local Development:** Use `node bin/lean-spec.js <command>` instead of `npx lean-spec`. Build first with `pnpm build`.

## ⚠️ Core Rules

| Rule | Details |
|------|---------|
| **NEVER edit frontmatter manually** | Use `update`, `link`, `unlink` for: `status`, `priority`, `tags`, `assignee`, `transitions`, timestamps, `depends_on`, `related` |
| **ALWAYS link spec references** | Content mentions another spec → `lean-spec link <spec> --related <other>` or `--depends-on <other>` |
| **Track status transitions** | `planned` → `in-progress` (before coding) → `complete` (after done) |
| **No nested code blocks** | Use indentation instead |

### 🚫 Common Mistakes

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Create spec files manually | Use `create` tool |
| Skip discovery | Run `board` and `search` first |
| Leave status as "planned" | Update to `in-progress` before coding |
| Edit frontmatter manually | Use `update` tool |

## 📋 SDD Workflow

```
BEFORE: board → search → check existing specs
DURING: update status to in-progress → code → document decisions → link related specs
AFTER:  update status to complete → document learnings
```

**Status tracks implementation, NOT spec writing.**

## Spec Relationships

| Type | Direction | Use When |
|------|-----------|----------|
| `related` | Bidirectional | Related topics, coordinated work |
| `depends_on` | Directional | True blocker, work order matters |

**Default to `related`**. Reserve `depends_on` for true blockers.

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

## First Principles (Priority Order)

1. **Context Economy** - <2,000 tokens optimal, >3,500 needs splitting
2. **Signal-to-Noise** - Every word must inform a decision
3. **Intent Over Implementation** - Capture why, let how emerge
4. **Bridge the Gap** - Both human and AI must understand
5. **Progressive Disclosure** - Add complexity only when pain is felt

## Quality Validation

Before completing work:
```bash
node bin/lean-spec.js validate              # Check structure
node bin/lean-spec.js validate --check-deps # Verify dependencies
cd docs-site && npm run build               # Test docs build
```

## Publishing Releases

See [docs/agents/PUBLISHING.md](docs/agents/PUBLISHING.md).

**Mandatory steps:**
1. Update versions & CHANGELOG
2. `pnpm pre-release`
3. Commit, tag, push
4. `pnpm prepare-publish`
5. Publish to npm (all packages)
6. `pnpm restore-packages`
7. **CREATE GITHUB RELEASE** ← DO NOT SKIP
8. Verify

## Advanced: Parallel Development

Use Git worktrees for multiple specs:
```bash
git worktree add .worktrees/spec-045-feature -b feature/045-feature
```

See [docs/agents/WORKFLOWS.md](docs/agents/WORKFLOWS.md) for patterns.

---

**Remember**: Context Economy → Signal-to-Noise → Intent → Bridge Gap → Progressive Disclosure
