---
status: planned
created: 2026-02-06
priority: medium
tags:
- lifecycle
- validation
- workflow
- umbrella
created_at: 2026-02-06T14:20:04.238914Z
updated_at: 2026-02-06T14:20:04.238914Z
---

# Spec Lifecycle Enhancements

## Overview

Umbrella spec for improvements to the spec lifecycle — status transitions, validation rules, and lifecycle management commands.

## Children

- **216** - Restore/Unarchive command for bidirectional lifecycle transitions
- **269** - Draft status for human-reviewed spec refinement before planning
- **273** - Flexible completion validation with N/A marking and section rules

## Design

These specs share a common theme: enhancing how specs move through their lifecycle stages (draft → planned → in-progress → complete → archived) with better tooling, flexibility, and guardrails.

## Plan

- [ ] Implement draft status (269)
- [ ] Implement flexible completion validation (273)
- [ ] Implement restore/unarchive command (216)

## Test

- [ ] Full lifecycle flow works: draft → planned → in-progress → complete → archived → restored
- [ ] Validation rules are configurable per-project
- [ ] Backward compatible with existing specs