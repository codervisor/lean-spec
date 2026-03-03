---
status: planned
created: 2026-03-03
priority: high
tags:
- testing
- e2e
- agent-browser
- strategy
- quality
created_at: 2026-03-03T07:25:37.538188Z
updated_at: 2026-03-03T07:25:37.538188Z
---

# E2E Test Strategy: Agent-Browser for UI Testing

## Overview

Despite spec 177 (Playwright E2E) being marked complete, **no actual e2e tests exist** in the codebase. The UI (`@leanspec/ui`) only has 8 unit test files. Rather than adopting a traditional Playwright setup, we should leverage the **agent-browser skill** — an AI-native browser automation CLI already available in the project — for UI e2e testing.

### Why Agent-Browser over Playwright

| Concern | Playwright | Agent-Browser |
|---------|-----------|---------------|
| Test authoring | Manual script writing | AI-driven, natural language |
| Maintenance | Brittle selectors break | Semantic locators + ref-based |
| Setup | Install browsers, config | Already available as a skill |
| AI workflow fit | Separate toolchain | Native to AI agent sessions |
| Debugging | Trace files, screenshots | Live snapshots, video recording |

### What Needs E2E Coverage

The LeanSpec UI (Next.js) has these critical flows with zero e2e coverage:
1. **Spec browsing** — list, filter, search, detail view
2. **Board view** — grouping, status visualization
3. **Dependency graph** — DAG/network rendering
4. **Metadata editing** — inline status/priority/tag changes
5. **AI chat** — model selection, conversation, tool calls
6. **Settings** — project config, AI provider setup
7. **i18n** — language switching (EN/ZH)

## Design

### Approach: Agent-Browser Skill as E2E Runner

Use the `agent-browser` CLI to drive browser sessions against a locally running `@leanspec/ui` dev server. Tests are defined as reproducible agent-browser command sequences.

```bash
# Example: Test spec list page loads
agent-browser open http://localhost:3000
agent-browser snapshot
agent-browser assert "spec-list" --visible
agent-browser click @specs-link
agent-browser snapshot
```

### Test Organization

```
e2e/
├── README.md              # How to run e2e tests
├── scripts/
│   ├── smoke.sh           # Quick smoke test suite
│   ├── specs-browsing.sh  # Spec list/detail flows
│   ├── board-view.sh      # Board interactions
│   ├── dependencies.sh    # Graph visualization
│   ├── metadata-edit.sh   # Inline editing
│   ├── ai-chat.sh         # Chat UI flows
│   └── i18n.sh            # Language switching
└── screenshots/           # Reference screenshots
```

### Integration with Existing Tests

- **Unit tests** (`vitest`) — continue as-is for logic/utils
- **E2E tests** (`agent-browser`) — browser-level workflow validation
- **CI** — run smoke tests on PRs, full suite on main

## Plan

- [ ] Define smoke test suite covering page loads and basic navigation
- [ ] Create spec browsing e2e tests (list, filter, detail view)
- [ ] Create board view e2e tests (grouping, interactions)
- [ ] Create metadata editing e2e tests (inline edits, save)
- [ ] Create dependency graph e2e tests (render, navigate)
- [ ] Add `pnpm test:e2e` script that starts dev server + runs agent-browser tests
- [ ] Add CI workflow for e2e tests on PRs touching `packages/ui/`
- [ ] Document e2e testing workflow in e2e/README.md

## Test

- [ ] Smoke suite passes against local dev server
- [ ] All critical user flows have at least one e2e test
- [ ] CI runs e2e tests and reports failures with screenshots
- [ ] Tests are reproducible (no flaky failures from timing)

## Notes

- Spec 177 (Playwright approach) is superseded by this strategy
- Agent-browser sessions support state persistence — login once, reuse auth across tests
- Consider mobile viewport testing via agent-browser's iOS simulator support
- Start with smoke tests, expand coverage incrementally
