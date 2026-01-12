# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## ⚠ Core Rules

1. Always use `pnpm` instead of `npm` where applicable
2. **DRY Principle** - Don't Repeat Yourself: Extract common logic to shared utilities/modules rather than duplicating code

## 🚨 CRITICAL: Before ANY Task

1. **Discover** → `board` or `lean-spec board` to see project state
2. **Search** → `search` or `lean-spec search` before creating new specs  
3. **Never create files manually** → Always use `create` tool or `lean-spec create`

### 🔍 Search Query Best Practices

| ✅ Good Query                            | ❌ Poor Query                                        |
| --------------------------------------- | --------------------------------------------------- |
| `"search ranking"`                      | `"AI agent integration coding agent orchestration"` |
| `"token validation"`                    | `"how to validate tokens in specs"`                 |
| `"api"` + tags filter `["integration"]` | `"api integration feature"`                         |

**Why?** All search terms must appear in the SAME field/line to match. Use 2-4 specific terms + filters instead of long queries.

## 🔧 Managing Specs

### MCP Tools (Preferred) with CLI Fallback

| Action         | MCP Tool   | CLI Fallback                                   |
| -------------- | ---------- | ---------------------------------------------- |
| Project status | `board`    | `lean-spec board`                              |
| List specs     | `list`     | `lean-spec list`                               |
| Search specs   | `search`   | `lean-spec search "query"`                     |
| View spec      | `view`     | `lean-spec view <spec>`                        |
| Create spec    | `create`   | `lean-spec create <name>`                      |
| Update spec    | `update`   | `lean-spec update <spec> --status <status>`    |
| Link specs     | `link`     | `lean-spec link <spec> --depends-on <other>`   |
| Unlink specs   | `unlink`   | `lean-spec unlink <spec> --depends-on <other>` |
| Dependencies   | `deps`     | `lean-spec deps <spec>`                        |
| Token count    | `tokens`   | `lean-spec tokens <spec>`                      |
| Validate specs | `validate` | `lean-spec validate`                           |

**Local Development:** Use `node bin/lean-spec.js <command>` instead of `npx lean-spec`. Build first with `pnpm build`.

## ⚠️ Core Rules

| Rule                                | Details                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NEVER edit frontmatter manually** | Use `update`, `link`, `unlink` for: `status`, `priority`, `tags`, `assignee`, `transitions`, timestamps, `depends_on`                            |
| **ALWAYS link spec references**     | Content mentions another spec → `lean-spec link <spec> --depends-on <other>`                                                                     |
| **Track status transitions**        | `planned` → `in-progress` (before coding) → `complete` (after done)                                                                              |
| **Keep specs current**              | Document progress, decisions, and learnings as work happens. Obsolete specs mislead both humans and AI                                           |
| **No nested code blocks**           | Use indentation instead                                                                                                                          |
| **Update all translations**         | UI/MCP/CLI changes: Update both `en/common.json` and `zh-CN/common.json` in `packages/ui/src/locales/` (Vite UI) and `packages/mcp/src/locales/` |

### 🚫 Common Mistakes

| ❌ Don't                             | ✅ Do Instead                                |
| ----------------------------------- | ------------------------------------------- |
| Create spec files manually          | Use `create` tool                           |
| Skip discovery                      | Run `board` and `search` first              |
| Leave status as "planned"           | Update to `in-progress` before coding       |
| Edit frontmatter manually           | Use `update` tool                           |
| Complete spec without documentation | Document progress, prompts, learnings first |
| Update only English translations    | Update both `en` and `zh-CN` locales        |

## 📋 SDD Workflow

```
BEFORE: board → search → check existing specs
DURING: update status to in-progress → code → document decisions → link dependencies
AFTER:  document completion → check off all checklist items → update status to complete
```

**Status tracks implementation, NOT spec writing.**

### Completion Verification

When marking a spec complete (`--status complete`), LeanSpec verifies all checklist items are checked:
- Unchecked items (`- [ ]`) will block completion with actionable feedback
- Use `--force` to mark complete anyway (e.g., for deferred items)
- This helps AI agents self-verify before declaring work done

## Spec Dependencies

Use `depends_on` to express blocking relationships between specs:
- **`depends_on`** = True blocker, work order matters, directional (A depends on B)

Link dependencies when one spec builds on another:
```bash
lean-spec link <spec> --depends-on <other-spec>
```

## When to Use Specs

| ✅ Write spec        | ❌ Skip spec                |
| ------------------- | -------------------------- |
| Multi-part features | Bug fixes                  |
| Breaking changes    | Trivial changes            |
| Design decisions    | Self-explanatory refactors |

## Token Thresholds

| Tokens      | Status               |
| ----------- | -------------------- |
| <2,000      | ✅ Optimal            |
| 2,000-3,500 | ✅ Good               |
| 3,500-5,000 | ⚠️ Consider splitting |
| >5,000      | 🔴 Must split         |

## First Principles (Priority Order)

1. **Context Economy** - <2,000 tokens optimal, >3,500 needs splitting
2. **Signal-to-Noise** - Every word must inform a decision
3. **Intent Over Implementation** - Capture why, let how emerge
4. **Bridge the Gap** - Both human and AI must understand
5. **Progressive Disclosure** - Add complexity only when pain is felt

## Quality Validation

Before completing work, validate spec quality:
```bash
node bin/lean-spec.js validate              # Check structure and quality
node bin/lean-spec.js validate --check-deps # Verify dependency alignment
cd docs-site && npm run build               # Test docs build (if applicable)
```

Validation checks:
- Missing required sections
- Excessive length (>400 lines)
- Content/frontmatter dependency misalignment
- Invalid frontmatter fields

See [docs/agents/RULES.md](docs/agents/RULES.md) for development rules.

## Publishing Releases

See [docs/agents/PUBLISHING.md](docs/agents/PUBLISHING.md).

**For dev versions (CI only):**
```bash
gh workflow run publish-dev.yml  # Publishes all platforms
```

**Mandatory steps for stable releases:**
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

**Remember:** LeanSpec tracks what you're building. Keep specs in sync with your work!
