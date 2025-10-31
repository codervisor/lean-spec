# AI Agent Instructions

## Project: lean-spec

Lightweight spec methodology for AI-powered development. **Practice what we preach—keep it lean.**

## Core Rules

1. **Read README.md first** - Understand the methodology
2. **Follow LeanSpec principles** - Clarity over documentation, essential over exhaustive
3. **Keep it minimal** - If it doesn't add clarity, cut it
4. **Make it practical** - Everything must be immediately usable

## Project Structure

```
/
├── README.md              # Main docs
├── AGENTS.md              # This file
├── src/                  # TypeScript CLI source
│   ├── cli.ts
│   └── commands.ts
├── templates/
│   └── spec.md           # Minimal template
├── specs/                # Date-based: YYYYMMDD/NNN-name.md
│   └── archived/         # Old specs
└── examples/             # Working examples for users
```

## Common Tasks

### Adding Features
- Spec first: `lspec create feature-name`
- Keep specs under 50 lines
- Update when you learn, not before

### Updating Docs
- Prioritize README.md as source of truth
- Remove redundancy aggressively
- Use examples over explanations

### Enhancing CLI
- Keep TypeScript code simple
- Minimal dependencies
- Test all commands
- CLI is TS, methodology is language-agnostic

### Adding Examples
- Must be complete and working
- Include README with clear use case
- Keep it minimal

## Quality Check

Before committing:
- [ ] Is this the minimum needed?
- [ ] Can someone use it immediately?
- [ ] Does it follow our own methodology?
- [ ] Have I tested it?

## What to Avoid

- Long explanations (show, don't tell)
- Multiple sections saying the same thing
- "While we're here" scope creep
- Templates with too many fields
- Over-engineering simple tools

---

**Dogfood rule**: If this file feels too long, cut more.
