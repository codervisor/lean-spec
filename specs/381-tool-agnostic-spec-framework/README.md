---
status: in-progress
created: 2026-04-16
priority: critical
tags:
- strategy
- architecture
- framework
- pivot
depends_on:
- "380-leanspec-positioning-and-codervisor-vision"
created_at: 2026-04-16T00:00:00Z
updated_at: 2026-04-16T00:00:00Z
---

# Tool-Agnostic Spec Framework

> Tracked in GitHub: https://github.com/codervisor/lean-spec/issues/168

## Overview

LeanSpec pivots from "a spec tool" to "a spec coding framework" — a platform-adapter
architecture with a distributable skill that teaches AI agents spec coding methodology.

**Spec coding** means treating specs as durable development artifacts that persist beyond
sessions, drive development, are verifiable against actual code, and compose into a
project graph. This is fundamentally different from ephemeral planning.

The framework comprises three layers:

1. **Platform adapters** — thin wrappers that speak each backend's native language
2. **CLI** — the backbone that works with any adapter
3. **Skill** — the distributable product that teaches AI agents the methodology

### What LeanSpec no longer prescribes

- No required template or file format
- No YAML frontmatter schema
- No fixed status lifecycle or priority levels
- No specific section structure

### What LeanSpec provides

- A methodology for spec coding (specs as artifacts)
- Adapters to connect to existing workflows (GitHub, ADO, Jira, markdown)
- A CLI that works through any adapter
- A distributable skill for AI agent consumption
- Intelligence features (search, deps, validation) across platforms

## Design

See the full design in [GitHub Issue #168](https://github.com/codervisor/lean-spec/issues/168).

Key architectural decision: **adapters do NOT normalize into a universal schema**.
Each adapter preserves the platform's native data model. The CLI and skill handle
presentation — there is no `SpecInfo` or `SpecFrontmatter` intermediary.

## Plan

1. Adapter architecture (trait design, markdown adapter as reference)
2. Skill redesign (methodology-first, SOP-agnostic)
3. GitHub adapter (first external platform)
4. CLI adaptation (remove hardcoded markdown assumptions)
5. ADO + Jira adapters

## Notes

This spec supersedes the original provider-based approach that normalized all backends
into `SpecProvider` → `SpecInfo`. That approach was rejected because it still imposed
LeanSpec's schema (frontmatter fields, status lifecycle) on every backend.
