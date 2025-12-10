---
status: planned
created: '2025-12-10'
tags:
  - ui
  - validation
  - tokens
  - feature
priority: medium
created_at: '2025-12-10T06:39:09.954Z'
updated_at: '2025-12-10T06:39:36.213Z'
depends_on:
  - 035-live-specs-showcase
  - 018-spec-validation
  - 069-token-counting-utils
---

# UI Display of Tokens and Validation Results

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-12-10 · **Tags**: ui, validation, tokens, feature
>
> **Depends On**: 035-live-specs-showcase, 018-spec-validation, 069-token-counting-utils

## Overview

Add token counts and validation results information to the LeanSpec web UI to provide immediate visibility into spec quality metrics. Currently, users must run CLI commands (`lean-spec tokens`, `lean-spec validate`) to see this information, but having it displayed directly in the UI would improve workflow efficiency and help maintain spec quality standards.

**Why now?**
- Token counts and validation status are critical quality indicators
- Users currently need to switch between CLI and web UI
- Improves adherence to Context Economy principles by making metrics visible
- Supports the AI-first workflow by showing spec readiness for LLM consumption

## Design

### Information to Display

**Token Information:**
- Total token count for each spec
- Token breakdown by content type (prose, code blocks, frontmatter)
- Context economy status (optimal/good/warning/critical thresholds)
- Token density metrics

**Validation Results:**
- Overall validation status (pass/fail)
- Specific validation errors/warnings
- Frontmatter validation status
- Content quality indicators

### UI Placement

**Spec Detail Page:**
- Token summary in metadata sidebar
- Validation status badge/indicator
- Expandable validation details section

**Spec List/Browse Page:**
- Token count column (sortable)
- Validation status icons
- Quick validation summary on hover

**Dashboard/Stats Page:**
- Aggregate token metrics across project
- Validation health overview
- Quality trend indicators

### Technical Implementation

**Data Sources:**
- Reuse existing `lean-spec tokens` CLI functionality
- Integrate with `lean-spec validate` command
- Cache results in database for performance

**UI Components:**
- Token display component with color-coded thresholds
- Validation status indicator with tooltip details
- Progress bars for quality metrics

## Plan

### Phase 1: Backend Integration (1-2 days)
- [ ] Add token counting API endpoint to UI package
- [ ] Add validation results API endpoint
- [ ] Update database schema to cache token/validation data
- [ ] Implement background sync for token/validation data

### Phase 2: UI Components (2-3 days)
- [ ] Create TokenDisplay component with thresholds
- [ ] Create ValidationStatus component
- [ ] Add token column to spec list view
- [ ] Integrate validation indicators in spec detail page

### Phase 3: Dashboard Integration (1 day)
- [ ] Add token metrics to stats dashboard
- [ ] Add validation health overview
- [ ] Implement quality trend charts

### Phase 4: Polish & Testing (1-2 days)
- [ ] Add loading states and error handling
- [ ] Implement responsive design
- [ ] Add unit tests for new components
- [ ] Update documentation

## Test

### Unit Tests
- [ ] TokenDisplay component renders correct colors for thresholds
- [ ] ValidationStatus shows appropriate icons for different states
- [ ] API endpoints return correct data format

### Integration Tests
- [ ] Token data syncs correctly from CLI to UI
- [ ] Validation results update in real-time
- [ ] UI handles missing token/validation data gracefully

### E2E Tests
- [ ] Browse specs and see token counts in list view
- [ ] View spec detail and see validation status
- [ ] Dashboard shows aggregate token metrics

### Performance Tests
- [ ] Token calculation doesn't slow down page loads
- [ ] Validation status updates don't impact UI responsiveness

## Notes

### Dependencies
- Depends on: 035-live-specs-showcase (UI foundation)
- Depends on: 018-spec-validation (validation logic)
- Depends on: 069-token-counting-utils (token counting)

### Open Questions
- Should token counts be calculated on-demand or cached?
- How frequently should validation status be refreshed?
- Should we show token breakdowns in tooltips or expandable sections?

### Design Decisions
- Color coding: Green (optimal: <2k), Yellow (good: 2-3.5k), Orange (warning: 3.5-5k), Red (critical: >5k)
- Validation icons: ✅ Pass, ⚠️ Warnings, ❌ Fail
- Token display format: "2.1k tokens" with progress bar
