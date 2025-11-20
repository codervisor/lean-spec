---
status: planned
created: '2025-11-03'
tags:
  - integration
  - pm
  - github
  - jira
  - ado
priority: low
related:
  - 109-local-project-switching
created_at: '2025-11-20T05:50:48.136Z'
updated_at: '2025-11-20T05:50:48.136Z'
---

# External PM Systems Integration

> **Status**: 🗓️ Planned · **Priority**: Low · **Created**: 2025-11-03 · **Tags**: integration, pm, github, jira, ado

**Project**: lean-spec  
**Team**: Core Development

## Overview

Enable bidirectional sync between LeanSpec and external project management systems (GitHub Issues/Projects, Azure DevOps, Jira). This allows teams to use LeanSpec for lightweight spec management while maintaining existing PM workflows and tooling.

**Why now?** Teams already use established PM systems. Rather than forcing a migration, we should integrate with existing workflows. This reduces friction for adoption and allows LeanSpec to complement rather than replace existing tools.

## Design

**Core Principles:**
- LeanSpec remains source of truth for *specs* (technical design)
- PM systems remain source of truth for *work items* (tracking, assignments)
- Bidirectional sync keeps them aligned without duplication
- Opt-in per project/spec; not all specs need PM tracking

**Architecture:**

**Plugin System:**
- Pluggable adapter architecture for different PM systems
- Common interface: `PMAdapter` with methods like `sync()`, `push()`, `pull()`
- Adapters: `GitHubAdapter`, `JiraAdapter`, `AzureDevOpsAdapter`

**Mapping Model:**
```yaml
# .lean-spec/integrations.yml
github:
  enabled: true
  repo: owner/repo
  mapping:
    - spec: "specs/20251103/019-mcp-server"
      issue: 123
      sync: bidirectional  # or push-only, pull-only
    - pattern: "specs/**/*-api-*"
      label: "api"
      project: "Backend Roadmap"
```

**Sync Behaviors:**

**Push (LeanSpec → PM):**
- Spec created → Create issue/work item
- Status change → Update issue status
- Spec completed → Close issue
- Custom fields sync to PM fields

**Pull (PM → LeanSpec):**
- Issue assigned → Notification or status hint
- Issue status changed → Suggest spec status update
- Issue comments → Option to append to spec notes

**Bidirectional:**
- Detect conflicts and prompt resolution
- Last-write-wins with optional manual review

**Commands:**
```bash
lean-spec sync                          # Sync all configured integrations
lean-spec sync --system github          # Sync specific system
lean-spec link <spec> --github-issue 123 # Link existing spec to issue
lean-spec unlink <spec>                 # Remove integration link
lean-spec integrations                  # Show current integration status
```

**Supported Systems (Phase 1):**

**GitHub Issues/Projects:**
- Map spec → issue
- Sync status: planned → open, in-progress → in progress, complete → closed
- Sync labels from tags
- Link to project boards

**Jira:**
- Map spec → story/task
- Sync status to Jira workflow states
- Custom field mappings
- Epic linking

**Azure DevOps:**
- Map spec → work item
- Sync state: planned → New, in-progress → Active, complete → Closed
- Area path and iteration support

## Plan

- [ ] Design plugin architecture and adapter interface
- [ ] Implement core sync engine with conflict detection
- [ ] Create configuration schema for integrations
- [ ] Build GitHub adapter (issues + projects)
- [ ] Build Jira adapter
- [ ] Build Azure DevOps adapter
- [ ] Add CLI commands for sync and linking
- [ ] Implement status mapping customization
- [ ] Add webhook support for real-time sync (optional)
- [ ] Create setup wizard for integration config
- [ ] Write comprehensive docs for each PM system
- [ ] Test with real projects on each platform

## Test

- [ ] Spec creation creates linked PM item
- [ ] Status changes sync correctly in both directions
- [ ] Conflict detection works and prompts user
- [ ] Manual link command associates existing items
- [ ] Unlink removes integration cleanly
- [ ] Custom field mappings work
- [ ] Sync respects push-only/pull-only/bidirectional settings
- [ ] Works with multiple PM systems simultaneously
- [ ] Handles API errors gracefully (rate limits, auth)
- [ ] Webhook sync has acceptable latency (<5s)

## Notes

**Authentication:**
- Use environment variables or config file for tokens
- Support GitHub PAT, Jira API token, Azure DevOps PAT
- Secure storage via OS keychain (optional enhancement)

**Scope Boundaries:**
- **DO**: Sync spec metadata, status, basic fields
- **DON'T**: Try to sync full spec content to PM system
- **DO**: Link and cross-reference
- **DON'T**: Replace PM system with LeanSpec

**Phasing:**
- Phase 1: GitHub Issues (most common, easiest)
- Phase 2: Jira (enterprise demand)
- Phase 3: Azure DevOps (Microsoft shops)
- Future: Linear, Asana, Monday, etc.

**Related:**
- Custom frontmatter (spec 002) - needed for PM-specific fields
- MCP server (spec 019) - could expose sync status to AI
- GitHub Action (spec 004) - could trigger sync on push

**Technical Considerations:**
- Rate limiting: batch operations, respect API limits
- Webhooks: optional for real-time updates, adds complexity
- Caching: store last sync state to detect changes
- Error handling: partial failures shouldn't break whole sync

**Open Questions:**
- Should sync be automatic (on every command) or manual?
- How do we handle spec renames when linked to PM items?
- Should we sync spec *content* as issue description? (leaning no)
- Do we need conflict resolution UI or CLI prompts enough?
