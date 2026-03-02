---
status: planned
created: 2026-03-02
priority: high
tags:
- documentation
- readme
- awareness
- growth
- docs-site
- dx
depends_on:
- 347-automated-screenshot-video-capture
created_at: 2026-03-02T02:26:30.274686385Z
updated_at: 2026-03-02T02:41:47.556310697Z
---

# README & Documentation Refresh for User Awareness

## Overview

**Purpose**: Update the README and documentation site to accurately reflect all features shipped in v0.2.22–v0.2.25, close documentation gaps, and improve discoverability to attract new users.

**Problem**: The README and docs-site have fallen behind the pace of development. Major features shipped over the last month are undocumented or under-represented:

- **AI Chat & Multi-Provider Support** (v0.2.20–v0.2.24): Full chat UI with OpenAI, Anthropic, OpenRouter, models.dev registry, tool call rendering, reasoning support — not mentioned in README or docs.
- **Sessions & ACP** (v0.2.25): Prompt-first session creation, ACP human-in-the-loop, session streaming, resume — no documentation exists.
- **Spec Hierarchy** (v0.2.22–v0.2.25): Parent-child relationships, `rel`/`children`/`deps` commands, hierarchy validation, umbrella specs — docs only partially cover this.
- **Files Page** (v0.2.25): Full file browser with syntax highlighting and search — not documented.
- **Draft Status** (v0.2.24): New spec workflow stage — not explained in docs.
- **Customizable Field Enums** (v0.2.24): Project-specific status/priority values — undocumented.
- **Docker Deployment** (v0.2.24): Deployment option mentioned in CHANGELOG but no guide.
- **Inline Metadata Editing** (v0.2.22): Quick status/priority edits in list/board views — not in any guide.
- **Settings & Model Configuration** (v0.2.23–v0.2.24): Provider management, runner config, API key validation — no docs.
- **Advanced Search Refactoring** (v0.2.25): Modular search with fuzzy matching — undocumented.
- **Desktop App Migration** (v0.2.25): Moved to separate repo — README updated but docs may have stale references.

**Impact**: Potential users evaluating LeanSpec see an incomplete picture. Key differentiators (AI chat, sessions, hierarchy) are invisible. The README's feature table and docs reference pages are stale.

## Design

### Part 1: README Updates

#### Feature Table Refresh
Update the features table to include new capabilities:

| Feature | Description |
|---------|-------------|
| **💬 AI Chat** | Built-in multi-provider chat (OpenAI, Anthropic, OpenRouter) |
| **🔄 Sessions** | AI coding sessions with prompt-first UX and ACP support |
| **🏗️ Spec Hierarchy** | Parent-child relationships and umbrella spec management |
| **📁 File Browser** | Browse and search project files with syntax highlighting |
| **📊 Kanban Board** | Visual project tracking with inline editing |
| **🔍 Smart Search** | Fuzzy search across specs by content or metadata |
| **🔗 Relationships** | Dependencies, parent-child, and required_by tracking |
| **🎨 Web UI** | Full dashboard at localhost:3000 |
| **📈 Project Stats** | Health metrics and bottleneck detection |
| **🤖 AI-Native** | MCP server + CLI for AI assistants |
| **⚙️ Agent Skills** | Teach AI assistants the SDD methodology |

#### New Sections to Add
- **AI Chat** section: brief description with config snippet showing multi-provider setup
- **Sessions** section: one-liner about prompt-first AI coding sessions
- Update **AI Integration** section to mention sessions and chat capability
- Add a screenshot or visual for the Web UI (board + chat views)

#### Sections to Update
- **Quick Start**: verify commands still match current behavior
- **Why LeanSpec?**: strengthen the pitch with AI chat + sessions differentiators
- **Features table**: as above
- **Requirements**: verify versions are current

### Part 2: Documentation Site Updates

#### New Pages Required

| Page | Path | Priority |
|------|------|----------|
| AI Chat Guide | /docs/guide/usage/ai-chat.mdx | High |
| Sessions Guide | /docs/guide/usage/sessions.mdx | High |
| Spec Hierarchy Guide | /docs/guide/usage/spec-hierarchy.mdx | High |
| Settings & Configuration | /docs/guide/usage/settings.mdx | Medium |
| Docker Deployment | /docs/guide/deployment.mdx | Medium |

#### Reference Pages to Update

- **CLI Reference** (`cli.mdx`): Add `rel`, `children`, `deps` commands; update `list` with `--parent` and `--hierarchy` flags; add `create --parent` and `--depends-on` options
- **MCP Reference** (`mcp-server.mdx`): Add `relationships`, `list_children`, `list_umbrellas`, `set_parent` tools
- **UI Package** (`ui-package.mdx`): Document visible UI features — file browser, inline editing, settings page, chat, sessions
- **Frontmatter** (`frontmatter.mdx`): Add `parent` field, `draft` status, custom enum fields
- **Config** (`config.mdx`): Document chat config, models registry, custom field enums

#### Existing Pages to Update

- **Getting Started** (`getting-started.mdx`): Mention AI chat and sessions as next steps
- **AI Coding Workflow** (`ai-coding-workflow.mdx`): Add sessions-based workflow alongside MCP workflow
- **Why LeanSpec** (`why-leanspec.mdx`): Update competitor comparison, add AI chat/sessions differentiators
- **Overview** (`index.mdx`): Update feature highlights
- **Roadmap** (`roadmap.mdx`): Update with shipped features and current v0.3.0 plans

#### Sidebar Updates
- Add new pages to `guideSidebar` under Usage section
- Consider grouping AI-related docs (Chat, Sessions, Agent Config) under "AI Features" category

### Part 3: Awareness & Discoverability

- Ensure README links to new docs pages
- Add "What's New" or "Recent Updates" callout in docs overview
- Update the docs-site meta description and keywords for SEO
- Verify all external links (tutorials, examples, live demo) work

## Plan

- [ ] Audit README against current feature set
- [ ] Update README feature table and add AI Chat / Sessions sections
- [ ] Update README screenshots if available
- [ ] Create AI Chat guide (docs-site)
- [ ] Create Sessions guide (docs-site)
- [ ] Create Spec Hierarchy guide (docs-site)
- [ ] Update CLI reference with new commands
- [ ] Update MCP reference with new tools
- [ ] Update frontmatter reference (parent, draft, custom enums)
- [ ] Update existing guides (getting-started, ai-coding-workflow, why-leanspec)
- [ ] Update sidebar configuration
- [ ] Update roadmap page
- [ ] Verify all links and build docs-site
- [ ] Review for SEO and discoverability improvements

## Test

- [ ] `pnpm docs:build` passes with no errors
- [ ] All internal links resolve correctly
- [ ] README renders correctly on GitHub
- [ ] New docs pages are accessible from sidebar navigation
- [ ] Feature descriptions match actual v0.2.25 behavior
- [ ] Code samples in docs are tested and work
- [ ] No stale references to removed features (e.g., desktop package in main repo)

## Notes

- Spec 278 (docs-site-orchestration-pivot) covers a broader strategic repositioning. This spec is more tactical: close the doc gaps from recent releases and update the README to reflect shipped features.
- Spec 055 (readme-redesign-ai-first) was the previous README overhaul — use it as reference for tone and structure.
- Spec 136 (growth-marketing-strategy-v2) may have relevant awareness ideas.
- The Chinese translations should be updated as a follow-up to avoid scope creep here.