# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## Skills

This project uses the Agent Skills framework for domain-specific guidance. **Read the appropriate skill when working on related tasks.**

### Spec-driven development (GitHub-issue specs)

Lean-spec dogfoods its own SDD methodology with GitHub issues as the canonical spec medium. The `specs/` directory is a **frozen historical snapshot** — new specs are GitHub issues on `codervisor/leanspec`. A pre-commit hook and CI job (`freeze-specs`) block additions/modifications under `specs/`; see [`specs/FROZEN.md`](specs/FROZEN.md).

1. **leanspec-dev-process** - End-to-end SDD loop (spec → branch → PR → merge)
   - Location: [.agents/skills/leanspec-dev-process/SKILL.md](.agents/skills/leanspec-dev-process/SKILL.md)
   - Use when: Starting non-trivial work, deciding spec-vs-trivial, picking branch name
   - Key: No PR without a spec issue or `trivial` label

2. **issue-spec** - Create lean-spec style GitHub issue specs
   - Location: [.agents/skills/issue-spec/SKILL.md](.agents/skills/issue-spec/SKILL.md)
   - Use when: Asked to "spec this" or planning work that needs alignment
   - Key: Body under ~2000 tokens; Overview / Design / Plan / Test / Provider impact / Alignment / Notes

3. **leanspec-pre-push** - Pre-push checks (sync main, typecheck, clippy, spec-link)
   - Location: [.agents/skills/leanspec-pre-push/SKILL.md](.agents/skills/leanspec-pre-push/SKILL.md)
   - Use when: About to `git push`, hitting merge conflicts, "ready to push"
   - Key: CI tests a merge preview, not the branch alone — always sync main first

4. **leanspec-pr-lifecycle** - Manage PR post-push (CI triage, review, label flips, merge)
   - Location: [.agents/skills/leanspec-pr-lifecycle/SKILL.md](.agents/skills/leanspec-pr-lifecycle/SKILL.md)
   - Use when: CI is failing, review comments arrive, PR needs label flip, merge follow-through
   - Key: Use `mcp__github__*` for issue/PR mutation; never `gh` CLI for that

### Development & tooling

5. **leanspec-development** - Development, commands, publishing, CI/CD, and runner research
   - Location: [.agents/skills/leanspec-development/SKILL.md](.agents/skills/leanspec-development/SKILL.md)
   - Use when: Contributing code, running tests, publishing, CI/CD, or looking up commands
   - Key: Always use `pnpm`, follow DRY principle, i18n parity is mandatory

6. **agent-browser** - Browser automation for testing web apps
   - Location: [.agents/skills/agent-browser/SKILL.md](.agents/skills/agent-browser/SKILL.md)
   - Use when: Testing web UIs, interacting with websites, filling forms, taking screenshots
   - Key: Use `agent-browser` CLI instead of Playwright MCP for browser automation

### Reference (external)

- **leanspec** (external) - Spec-Driven Development methodology for downstream users
  - Location: [skills/leanspec/SKILL.md](skills/leanspec/SKILL.md) (shipped from this repo)
  - Install: `npx skills add codervisor/leanspec@leanspec`
  - Use when: Reading what we ship to users (this repo dogfoods that methodology via the four skills above)

## Project-Specific Rules

1. **Use pnpm** - Never npm or yarn. All package management uses pnpm.
2. **DRY Principle** - Extract shared logic; avoid duplication.
3. **Skills First** - Read the relevant skill file before starting work on development, specs, or publishing tasks.
4. **Context Economy** - Keep specs under 2000 tokens. Split large tasks.
5. **Progressive Disclosure** - Use skills and references for detailed guidance.
6. **GitHub issues are canonical specs** - New specs are GitHub issues, not files. The `specs/` directory is a frozen snapshot of pre-migration work; do not author new `specs/NNN-slug/` directories. See `issue-spec` and `leanspec-dev-process`.
