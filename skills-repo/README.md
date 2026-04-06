# Codervisor Skills

Public agent skills for [Codervisor](https://github.com/codervisor) products.

## Available Skills

| Skill | Description | Install |
|-------|-------------|---------|
| **leanspec** | Spec-Driven Development methodology for AI-assisted development | `npx skills add codervisor/skills@leanspec` |

## Installation

Install a skill into your project using the [Agent Skills](https://github.com/anthropics/agent-skills) CLI:

```bash
# Install a specific skill
npx skills add codervisor/skills@leanspec

# Install into a specific directory
npx skills add codervisor/skills@leanspec --dir .agents/skills
```

The skill files are copied into your project's `.agents/skills/` directory and become available to AI coding agents (Claude, Cursor, Copilot, etc.).

## Skills

### leanspec

The **leanspec** skill teaches AI agents how to run Spec-Driven Development (SDD) using the [LeanSpec](https://github.com/codervisor/leanspec) CLI.

**Use when:** Working with specs, planning features, creating/implementing/refining/organizing specs, checking progress, updating specs, task breakdowns, or design decisions.

**Includes:**
- `SKILL.md` — Core SDD methodology and lifecycle
- `references/workflow.md` — Detailed workflow steps
- `references/best-practices.md` — Do's, don'ts, and verification patterns
- `references/commands.md` — Complete CLI command reference
- `references/examples.md` — Practical examples and templates

## Contributing

1. Fork this repository
2. Create a branch for your skill or improvement
3. Follow the skill structure:
   ```
   .agents/skills/<skill-name>/
   ├── SKILL.md          # Main skill file (required)
   └── references/       # Supporting reference docs (optional)
   ```
4. Ensure `SKILL.md` has valid frontmatter with `name` and `description`
5. Submit a pull request

## License

MIT
