---
status: planned
created: 2026-03-02
priority: high
tags:
- documentation
- automation
- screenshots
- video
- agent-browser
- dx
created_at: 2026-03-02T02:41:41.168844731Z
updated_at: 2026-03-02T02:41:41.168844731Z
---

# Automated Screenshot & Video Capture Pipeline

## Overview

**Purpose**: Build an automated pipeline that captures screenshots and short demo videos of LeanSpec UI features, producing ready-to-use visual assets for the README and documentation site.

**Problem**: The UI has evolved significantly (AI chat, sessions, file browser, hierarchy views, inline editing, settings page) but documentation screenshots are stale or missing. Manual screenshot capture is:
- Tedious and error-prone (inconsistent viewport sizes, themes, data states)
- Not reproducible (demo data differs each time)
- Not maintained (screenshots rot as the UI evolves)
- Blocking spec 340 (README & docs refresh needs visuals)

**Solution**: A scripted capture pipeline using `agent-browser` for browser automation and optionally Remotion for polished video/animated demos.

## Design

### Architecture: Two-Layer Approach

#### Layer 1: agent-browser Screenshot Capture (Core)

A shell script that:
1. Starts the LeanSpec UI dev server (`pnpm dev:web` or `lean-spec ui`)
2. Seeds a demo project with representative spec data
3. Uses `agent-browser` to navigate to each feature page and capture screenshots
4. Produces consistently-sized PNG files in a known output directory

```
scripts/capture-screenshots.sh
├── starts UI server (background)
├── seeds demo data (specs with hierarchy, various statuses, tags)
├── captures each view:
│   ├── board-view.png        (Kanban board with specs in columns)
│   ├── list-view.png         (List view with hierarchy grouping)
│   ├── spec-detail.png       (Spec detail page with metadata)
│   ├── chat-view.png         (AI chat with conversation)
│   ├── sessions-page.png     (Sessions management)
│   ├── files-page.png        (File browser with code viewer)
│   ├── settings-page.png     (Settings with model configuration)
│   ├── dependencies-graph.png (Dependency visualization)
│   ├── stats-dashboard.png   (Project stats/metrics)
│   └── search-results.png    (Search with results)
└── shuts down server
```

Key `agent-browser` commands per capture:
```bash
# Example: Board view capture
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser screenshot --full screenshots/board-view.png

# Example: Capture after interaction (e.g., opening chat)
agent-browser open http://localhost:3000/chat
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser click @e1  # Open a conversation
agent-browser wait 1000
agent-browser screenshot screenshots/chat-view.png
```

Configuration:
- **Viewport**: 1280x800 (standard for docs screenshots)
- **Theme**: Light mode (better for documentation), with optional dark mode variants
- **Demo data**: A fixture project with ~15 specs in various states, hierarchy, and dependencies

#### Layer 2: Remotion Video Compositions (Optional/Future)

For polished demo videos and animated GIFs:

1. **Remotion compositions** that render React components showing LeanSpec UI flows
2. **agent-browser recordings** converted to video clips via `agent-browser record start/stop`
3. Post-processing with Remotion for transitions, annotations, and branding

Use cases:
- Hero video for docs landing page (30s overview)
- Feature-specific clips for each docs page (5-10s each)
- GIF previews for README (board interaction, chat flow)

Remotion adds value for:
- Branded intros/outros and annotations
- Smooth transitions between feature highlights
- Consistent visual quality across all videos
- Programmatic rendering (CI-reproducible)

However, for the immediate needs (spec 340), agent-browser screenshots and `.webm` recordings are sufficient.

### Demo Data Fixture

A seed script or fixture project that creates consistent demo data:

```
fixtures/demo-project/
├── .lean-spec/config.json
└── specs/
    ├── 001-user-authentication/spec.md    (status: complete)
    ├── 002-dark-theme-support/spec.md     (status: in-progress)
    ├── 003-api-rate-limiting/spec.md      (status: planned, parent: 005)
    ├── 004-search-optimization/spec.md    (status: draft)
    ├── 005-performance-umbrella/spec.md   (status: in-progress, umbrella)
    ├── 006-mobile-responsive/spec.md      (status: planned, depends_on: 002)
    └── ... (10-15 specs covering all statuses, priorities, hierarchy)
```

### Output Structure

```
docs-site/static/img/ui/
├── board-view.png
├── board-view-dark.png
├── list-view.png
├── spec-detail.png
├── chat-view.png
├── sessions-page.png
├── files-page.png
├── settings-page.png
├── dependencies-graph.png
├── stats-dashboard.png
└── search-results.png
```

### pnpm Script Integration

```json
{
  "capture:screenshots": "scripts/capture-screenshots.sh",
  "capture:videos": "scripts/capture-videos.sh"
}
```

## Plan

### Phase 1: Screenshot Pipeline (Core — blocks spec 340)
- [ ] Create demo project fixture with representative spec data
- [ ] Write `scripts/capture-screenshots.sh` using agent-browser
- [ ] Capture all key views (board, list, detail, chat, sessions, files, settings, stats, deps, search)
- [ ] Add `capture:screenshots` pnpm script
- [ ] Validate output images and place in docs-site/static/img/ui/

### Phase 2: Video Recording Pipeline
- [ ] Write `scripts/capture-videos.sh` using agent-browser record
- [ ] Record short interaction flows (board drag, chat conversation, search)
- [ ] Convert .webm to .gif for README embedding
- [ ] Add `capture:videos` pnpm script

### Phase 3: Remotion Integration (Future)
- [ ] Set up Remotion project in docs-site or separate directory
- [ ] Create composition templates for feature demos
- [ ] Integrate agent-browser recordings as video sources
- [ ] Add branded overlays and annotations
- [ ] CI pipeline for automated video rendering

## Test

- [ ] `pnpm capture:screenshots` runs end-to-end and produces all expected PNGs
- [ ] Screenshots have consistent dimensions (1280x800)
- [ ] All screenshots show realistic demo data (not empty states)
- [ ] Screenshots render correctly in GitHub README and docs-site
- [ ] Script is idempotent (can be re-run to refresh screenshots)
- [ ] Video recordings play correctly in supported browsers

## Notes

- `agent-browser` (v0.15.1) is available via npx and supports: `screenshot`, `screenshot --full`, `record start/stop`, viewport configuration, and `wait --load networkidle`
- agent-browser already has a `capture-workflow.sh` template in the skills directory that can serve as a starting point
- The demo data fixture should be version-controlled so screenshots are reproducible
- Phase 1 is the blocker for spec 340; Phases 2-3 are enhancements
- Consider running the capture pipeline in CI to detect visual regressions