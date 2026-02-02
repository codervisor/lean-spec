---
status: archived
created: 2025-11-28
priority: low
tags:
- ui
- feature
- dx
- crud
created_at: 2025-11-28T03:30:16.617Z
updated_at: 2026-02-02T08:18:11.068513807Z
---
# UI Edit Capabilities

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-11-28 · **Tags**: ui, feature, dx, crud

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add editing capabilities to `@leanspec/ui` to enable spec management directly from the web interface.

## Problem

Currently `@leanspec/ui` is read-only. Users cannot:
- Update spec metadata (status, priority, tags, assignee)
- Edit spec content
- Create new specs
- Manage relationships (link/unlink)

This forces users to switch to CLI or MCP tools for any modifications.

## Proposed Solution

Implement progressive editing capabilities:

### Phase 1: Metadata Updates
- Status transitions (planned → in-progress → complete)
- Priority changes
- Tag management
- Assignee updates

### Phase 2: Content Editing
- Inline editing of spec content
- Markdown preview
- Auto-save or explicit save

### Phase 3: Full CRUD
- Create new specs from UI
- Archive/delete specs
- Link/unlink relationships

## Technical Considerations

- API endpoints already exist in `@leanspec/core`
- Need to handle concurrent edits (file watching)
- Consider optimistic updates with conflict resolution
- Mobile-friendly editing experience

## Design

<!-- Technical approach, architecture decisions -->

## Plan

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Test

<!-- How will we verify this works? -->

- [ ] Test criteria 1
- [ ] Test criteria 2

## Notes

<!-- Optional: Research findings, alternatives considered, open questions -->
