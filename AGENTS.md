# AI Agent Instructions

## Project: LeanSpec

Lightweight spec methodology for AI-powered development.

## Skills

This project uses the Agent Skills framework for domain-specific guidance. **Read the appropriate skill when working on related tasks.**

### Core Skills

1. **leanspec-sdd** - Spec-Driven Development methodology
   - Location: [.github/skills/leanspec-sdd/SKILL.md](.github/skills/leanspec-sdd/SKILL.md)
   - Use when: Working with specs, planning features, multi-step changes
   - Key: Run `board` or `search` before creating specs

2. **leanspec-development** - Development workflows and contribution guidelines
   - Location: [.github/skills/leanspec-development/SKILL.md](.github/skills/leanspec-development/SKILL.md)
   - Use when: Contributing code, setting up environment, running tests
   - Key: Always use `pnpm`, follow DRY principle

3. **leanspec-publishing** - Publishing and release workflows
   - Location: [.github/skills/leanspec-publishing/SKILL.md](.github/skills/leanspec-publishing/SKILL.md)
   - Use when: Preparing releases, publishing to npm
   - Key: Use GitHub Releases to trigger automated publishing

4. **github-actions** - GitHub Actions workflow management
   - Location: [.github/skills/github-actions/SKILL.md](.github/skills/github-actions/SKILL.md)
   - Use when: Triggering, monitoring, or debugging CI/CD workflows
   - Key: Use `gh` CLI for all workflow interactions

5. **agent-browser** - Browser automation for testing web apps
   - Location: [.agents/skills/agent-browser/SKILL.md](.agents/skills/agent-browser/SKILL.md)
   - Use when: Testing web UIs, interacting with websites, filling forms, taking screenshots
   - Key: Use `agent-browser` CLI instead of Playwright MCP for browser automation

## Project-Specific Rules

1. **Use pnpm** - Never npm or yarn. All package management uses pnpm.
2. **DRY Principle** - Extract shared logic; avoid duplication.
3. **Skills First** - Read the relevant skill file before starting work on development, specs, or publishing tasks.
4. **Context Economy** - Keep specs under 2000 tokens. Split large tasks.
5. **Progressive Disclosure** - Use skills and references for detailed guidance.
