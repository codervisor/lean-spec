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

## Overview

### Context

LeanSpec currently positions as a markdown-based SDD (Spec-Driven Development) tool that competes directly with SpecKit, OpenSpec, Kiro, and others on spec authoring and management. Every team and individual already has their own spec workflow — GitHub Issues/Projects for open-source, Azure DevOps Work Items for enterprise, Jira/Linear for startups, Notion for design-heavy teams, or plain markdown in a repo.

Forcing users to adopt yet another spec format and tool is a losing proposition. The real value isn't in *where* specs live — it's in how specs connect to code, AI agents, and development workflows.

### Problem

1. **Tool lock-in**: Current LeanSpec requires specs in `specs/NNN-name/README.md` with specific YAML frontmatter. Users must migrate their existing workflow.
2. **Competing on storage**: We compete with GitHub (infinite distribution), AWS Kiro (IDE integration), and Tessl ($125M funding) on spec authoring — a fight we cannot win.
3. **Ignoring existing workflows**: Developers already track specs/requirements somewhere. They won't maintain two systems.

### Vision

LeanSpec pivots from "a spec tool" to "a spec coding framework" — a provider-based abstraction that works with *any* spec backend. Think of it like how an ORM works with any database, or how MCP works with any tool.

```
Your existing specs          LeanSpec Framework           AI Agents & Workflows
─────────────────           ──────────────────           ─────────────────────
GitHub Issues      ─┐                                    Claude Code
ADO Work Items     ─┤       ┌──────────────┐             Cursor
Jira Tickets       ─┼──────→│ SpecProvider │──────────→  Windsurf
Linear Issues      ─┤       │  Abstraction │             GitHub Copilot
Notion Pages       ─┤       └──────────────┘             MCP Clients
Markdown Files     ─┘       Unified lifecycle,           CI/CD Pipelines
                            validation, search,
                            dependency tracking
```

Users keep their preferred spec workflow. LeanSpec provides the intelligence layer on top.

## Design

### Provider Architecture

A `SpecProvider` trait defines the contract for any spec backend:

```rust
#[async_trait]
pub trait SpecProvider: Send + Sync {
    /// Provider identity
    fn name(&self) -> &str;

    /// List all specs matching optional filters
    async fn list(&self, filters: &SpecFilterOptions) -> Result<Vec<SpecInfo>>;

    /// Get a single spec by ID
    async fn get(&self, id: &str) -> Result<SpecInfo>;

    /// Create a new spec
    async fn create(&self, spec: &CreateSpecRequest) -> Result<SpecInfo>;

    /// Update an existing spec
    async fn update(&self, id: &str, update: &UpdateSpecRequest) -> Result<SpecInfo>;

    /// Search specs by content
    async fn search(&self, query: &str, options: &SearchOptions) -> Result<Vec<SearchResult>>;

    /// Get dependency graph
    async fn dependencies(&self, id: &str) -> Result<DependencyGraph>;

    /// Provider capabilities (not all backends support everything)
    fn capabilities(&self) -> ProviderCapabilities;
}
```

### Built-in Providers

| Provider | Backend | Status |
|----------|---------|--------|
| `MarkdownProvider` | Local `specs/` directory (current format) | Built-in, default |
| `GitHubProvider` | GitHub Issues + Projects | Planned |
| `AdoProvider` | Azure DevOps Work Items | Planned |
| `JiraProvider` | Jira tickets via REST API | Future |
| `LinearProvider` | Linear issues via GraphQL | Future |
| `CompositeProvider` | Combines multiple providers | Planned |

### Provider Capabilities

Not every backend supports every feature. The framework gracefully degrades:

```rust
pub struct ProviderCapabilities {
    pub create: bool,
    pub update: bool,
    pub delete: bool,
    pub search: bool,
    pub dependencies: bool,
    pub custom_fields: bool,
    pub webhooks: bool,
    pub bidirectional_sync: bool,
}
```

### Configuration

Users configure providers in `.lean-spec/config.yaml` or `leanspec.config.yaml`:

```yaml
# Personal project — specs live in GitHub Issues
provider: github
github:
  owner: myuser
  repo: myproject
  label_prefix: "spec:"

# Work project — specs live in ADO
provider: ado
ado:
  organization: mycompany
  project: myproject
  work_item_type: "User Story"

# OSS project — specs stay as markdown (current behavior)
provider: markdown
markdown:
  directory: specs

# Power user — combine sources
provider: composite
composite:
  providers:
    - type: markdown
      directory: specs
    - type: github
      owner: myorg
      repo: myproject
      read_only: true
```

### Mapping Spec Concepts to Backends

Core LeanSpec concepts map naturally to existing tools:

| LeanSpec Concept | GitHub Issues | ADO Work Items | Jira | Markdown |
|-----------------|--------------|----------------|------|----------|
| Spec ID | Issue number | Work Item ID | Issue key | Directory name |
| Status | Open/Closed + Labels | State field | Status | Frontmatter `status` |
| Priority | Labels | Priority field | Priority | Frontmatter `priority` |
| Tags | Labels | Tags | Labels | Frontmatter `tags` |
| Dependencies | Issue references | Links | Issue links | Frontmatter `depends_on` |
| Assignee | Assignees | Assigned To | Assignee | Frontmatter `assignee` |
| Parent/Epic | Milestone or Project | Parent link | Epic link | Frontmatter `parent` |
| Content | Issue body | Description | Description | Markdown body |

### What LeanSpec Adds on Top

Even when specs live in GitHub Issues or ADO, LeanSpec provides:

1. **Unified CLI/MCP interface** — same commands regardless of backend
2. **AI-native access** — structured spec data for AI agents via MCP
3. **Cross-provider views** — kanban board, stats, dependency graphs work everywhere
4. **Validation** — spec quality checks adapted per provider
5. **Token economy** — context-aware spec summarization for AI consumption
6. **Lifecycle intelligence** — drift detection, bottleneck analysis, velocity tracking

## Plan

### Phase 1: Provider Abstraction (This PR)

- [x] Define `SpecProvider` trait and core types
- [x] Define `ProviderCapabilities` for graceful degradation
- [x] Refactor existing `SpecLoader` into `MarkdownProvider`
- [x] Add `GitHubProvider` and `AdoProvider` stub implementations
- [x] Add provider registry and factory
- [x] Update configuration to support provider selection

### Phase 2: GitHub Provider

- [ ] Implement `GitHubProvider` using GitHub REST/GraphQL API
- [ ] Map GitHub labels to LeanSpec status/priority/tags
- [ ] Support GitHub Projects for kanban-style views
- [ ] Bidirectional sync (optional): LeanSpec changes reflect in GitHub

### Phase 3: ADO Provider

- [ ] Implement `AdoProvider` using ADO REST API
- [ ] Map work item types, states, and fields
- [ ] Support ADO Boards integration

### Phase 4: Composite Provider & CLI Updates

- [ ] Implement `CompositeProvider` for multi-source setups
- [ ] Update CLI commands to work through provider abstraction
- [ ] Update MCP server to use provider abstraction
- [ ] Update Web UI to be provider-aware

## Test

- [ ] `MarkdownProvider` passes all existing spec tests (backwards compatible)
- [ ] Provider trait is object-safe and works with dynamic dispatch
- [ ] `GitHubProvider` stub compiles and returns appropriate "not implemented" errors
- [ ] `AdoProvider` stub compiles and returns appropriate "not implemented" errors
- [ ] Provider registry correctly resolves providers from config
- [ ] Capabilities system correctly reports what each provider supports

## Notes

### Backwards Compatibility

The `MarkdownProvider` is the default. Existing projects with `specs/` directories work exactly as before with zero configuration changes. The pivot is additive — we're expanding what LeanSpec can work with, not breaking what already works.

### Why Not Just Build Integrations?

The difference between "integrations" and a "provider framework" is architectural:
- **Integrations**: LeanSpec is the source of truth, syncs to/from other tools
- **Provider framework**: The user's preferred tool IS the source of truth, LeanSpec is the intelligence layer on top

The provider approach respects existing workflows instead of fighting them.
