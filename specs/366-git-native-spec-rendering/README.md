---
status: planned
created: 2026-03-09
priority: high
tags:
- git
- rendering
- corporate
- github
- gitlab
- markdown
- ci-cd
parent: 355-cloud-deployment-readiness
created_at: 2026-03-09T13:35:48.521104Z
updated_at: 2026-03-09T13:35:56.655342Z
---

# Git-Native Spec Rendering

## Overview

Enable teams to view and navigate specs directly in git repositories (GitHub, GitLab, Bitbucket, and self-hosted corporate instances) without running a LeanSpec server. This is critical for **corporate environments with private repos** where deploying a separate server may be impractical or blocked by IT policy.

## Motivation

Many teams — especially in enterprise/corporate settings — manage code in private git repositories on GitHub Enterprise, GitLab Self-Managed, or Bitbucket Server. These teams:

- Cannot easily deploy additional services due to infra restrictions
- Already have markdown rendering in their git platform
- Want spec visibility for team members who don't have LeanSpec installed
- Need specs accessible via existing code review workflows (PRs, MRs)

Git-native rendering lets specs be **first-class citizens in the repo** — readable, linkable, and reviewable alongside code.

## Design

### 1. Spec Index Generation (`lean-spec render`)

Generate a navigable index document from specs that renders natively in git platforms.

- `lean-spec render` — generates `SPECS.md` (or configurable output) at repo root
- Index includes: spec title, status, priority, tags, relationships
- Status badges using markdown image syntax (compatible with GitHub/GitLab)
- Grouped views: by status, by priority, by parent/child hierarchy
- Deep links to individual spec files (relative markdown links)
- Optional: generate per-status pages (`specs/STATUS-board.md`)

### 2. Spec File Enhancements for Git Rendering

Ensure individual spec files render well in git platforms.

- Add auto-generated navigation header/footer (links to parent, siblings, index)
- Render relationship links as clickable markdown links
- Include metadata summary table at top of spec (rendered from frontmatter)
- Mermaid diagram support (GitHub/GitLab render mermaid natively)
- Compatible with GitHub's markdown rendering, GitLab flavored markdown, and Bitbucket

### 3. CI/CD Integration

Keep the rendered index in sync via CI.

- GitHub Action / GitLab CI template to run `lean-spec render` on spec changes
- Auto-commit updated `SPECS.md` or open a PR with changes
- Pre-commit hook option for local workflows
- Configurable: which files to generate, output directory

### 4. Corporate Private Repo Considerations

- **No external dependencies** — rendering works offline, no API calls
- **Self-hosted git** — works with GitHub Enterprise, GitLab Self-Managed, Gitea, Bitbucket Server
- **No tokens or auth needed** — pure static markdown generation
- **Audit-friendly** — specs are plain markdown in version control
- **Air-gapped environments** — full functionality without internet

## Configuration

```json
{
  "render": {
    "output": "SPECS.md",
    "format": "github",
    "groupBy": "status",
    "includeRelationships": true,
    "includeMetadata": true,
    "statusBadges": true,
    "mermaidDiagrams": true,
    "outputDir": ".",
    "additionalPages": ["specs/BOARD.md"]
  }
}
```

Supported `format` values: `github`, `gitlab`, `bitbucket`, `generic`

## Plan

- [ ] Implement `lean-spec render` command (CLI + MCP)
- [ ] Generate `SPECS.md` index with status grouping and badges
- [ ] Generate relative markdown links between specs
- [ ] Add navigation headers to individual spec files (opt-in)
- [ ] Support mermaid dependency graph in rendered output
- [ ] Add `render.format` config for platform-specific markdown flavors
- [ ] Create GitHub Action for auto-rendering on spec changes
- [ ] Create GitLab CI template for auto-rendering
- [ ] Add pre-commit hook support
- [ ] Test rendering on GitHub, GitLab, and Bitbucket
- [ ] Document git-native workflow in docs-site

## Test

- [ ] `lean-spec render` generates valid `SPECS.md` with all specs listed
- [ ] Generated links resolve correctly in GitHub markdown preview
- [ ] Generated links resolve correctly in GitLab markdown preview
- [ ] Status badges render as expected on each platform
- [ ] Mermaid diagrams render on GitHub and GitLab
- [ ] CI action auto-updates `SPECS.md` on spec file changes
- [ ] Works in air-gapped environment with no network access
- [ ] Handles specs with special characters in names
- [ ] Parent/child hierarchy renders correctly in index

## Notes

- This complements (not replaces) the LeanSpec UI — teams choose based on their environment.
- Spec 255 (Git History Viewer) is related but focuses on viewing edit history within the UI.
- For teams using both: the rendered `SPECS.md` provides a read-only overview, while the UI/MCP tools remain the editing interface.
- Future: could integrate with GitHub Projects or GitLab boards via API, but that's out of scope here.