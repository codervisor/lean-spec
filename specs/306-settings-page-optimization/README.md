---
status: in-progress
created: 2026-02-04
priority: medium
created_at: 2026-02-04T08:35:19.416302Z
updated_at: 2026-02-04T09:07:57.006898Z
---
# Settings Page Optimization

## Overview

Comprehensive UX/UI improvements for the `/settings` pages to make them more professional, modern, and intuitive.

## Current State (Updated 2026-02-04)

The AI Settings Tab has been significantly re-implemented with:
- Registry-based provider system from models.dev
- Configured vs Unconfigured providers split
- Model capability indicators (tool call, reasoning, vision)
- Collapsible settings sidebar matching MainSidebar pattern
- Modern badge styling with icons

### Implementation Progress Summary

| Section | Status | Completion |
|---------|--------|------------|
| 1. Settings Sidebar Redesign | ✅ Complete | 100% |
| 2. List Item UI/UX Improvements | ⚠️ Partial | ~60% |
| 3. Search, Filter, and Sort | ❌ Not Started | 0% |
| 4. Auto-Detection for Validation | ❌ Not Started | 0% |
| 5. Streamlined Default Selection | ⚠️ Partial | ~30% |
| 6. Display Mode in Appearance | ✅ Complete | 100% |

## Requirements

### 1. Settings Sidebar Redesign ✅ COMPLETE

**Goal**: Match MainSidebar's icon-based pattern for consistency

Changes:
- [x] Use icon-only mode when collapsed (60px width like MainSidebar)
- [x] Keep full labels visible when expanded (240px)
- [x] Persist collapse state to localStorage (`settings-sidebar-collapsed` key)
- [x] Smooth transition animations (`transition-all duration-300`)
- [x] Add tooltips on hover when collapsed (via title attribute)
- [x] Match MainSidebar's visual design (spacing, colors, hover states)
- [x] Collapse/expand toggle button at bottom (matching MainSidebar pattern)

Reference: [packages/ui/src/layouts/SettingsLayout.tsx](packages/ui/src/layouts/SettingsLayout.tsx)

### 2. List Item UI/UX Improvements ⚠️ PARTIAL

**Goal**: Professional, modern design for AI providers/models and runners

For both AI providers and Runners:
- [ ] Add meaningful icons for each item type (e.g., OpenAI logo, Claude logo, or generic provider icons)
- [ ] Consolidate action buttons into a dropdown menu (⋮) for secondary actions
- [x] Keep primary actions (edit, set default) as icon buttons
- [x] Improve badge design with icons - DONE: CheckCircle, AlertCircle, Wrench icons
- [ ] Add hover card/tooltip for additional details
- [x] Standardize spacing and alignment across all cards
- [ ] Consider drag-and-drop for reordering

Badge improvements:
- [ ] Default: ⭐ icon with secondary variant - NOT DONE
- [x] API Key Configured: ✓ checkmark (success green) - DONE
- [x] No API Key: ⚠ warning icon (destructive) - DONE (AlertCircle)
- [x] Available/Unavailable: ✓/✕ with appropriate colors - DONE (for runners)
- [x] Source (builtin/custom): 📦 or 🔧 icons - DONE (Wrench icon)

**Bonus implemented** (not in original spec):
- [x] Model capability icons: Zap (tool_call), Brain (reasoning), ImageIcon (vision)
- [x] Context window display (e.g., "128k")

### 3. Search, Filter, and Sort ❌ NOT STARTED

**Goal**: Enable efficient navigation when many models/runners exist

For AI Models page:
- [ ] Search by provider name, model ID, or model name
- [ ] Filter by: has API key, is default provider
- [ ] Sort by: name, date added, number of models

For Runners page:
- [ ] Search by runner ID, name, or command
- [ ] Filter by: available/unavailable, source (builtin/custom), has command
- [ ] Sort by: name, availability status

UI Components:
- [ ] Search input with clear button
- [ ] Filter dropdown with checkboxes
- [ ] Sort dropdown with options
- [ ] Show result count (e.g., "Showing 3 of 10 runners")

### 4. Auto-Detection for Validation Status ❌ NOT STARTED

**Goal**: Automatically validate runners and check API configuration on load

For Runners:
- [ ] Auto-validate all runners when page loads
- [ ] Show loading spinners during validation
- [ ] Cache validation results (5 minute TTL)
- [ ] Add "Re-validate all" button for manual refresh
- [ ] Show last validated timestamp

For AI Providers:
- [ ] Auto-check API key validity on page load
- [ ] Send lightweight ping/test request to provider
- [ ] Show "Checking..." state during verification
- [ ] Cache results with 5 minute TTL
- [ ] Display detailed error messages on failure

### 5. Streamlined Default Selection ⚠️ PARTIAL

**Goal**: Intuitive one-click default setting experience

Improvements:
- [ ] Add star icon button on each provider/runner card
- [ ] Click star to toggle default (instant feedback)
- [ ] Filled star = current default, outline = can set as default
- [ ] Remove separate "Default Settings" section for runners
- [x] For AI: keep cascade logic (changing provider auto-selects first model) - DONE
- [ ] Show toast notification on default change
- [ ] Add keyboard shortcut (e.g., `D` when item focused)

Current State:
- Runners: has "Set as Default" button on each card (partial)
- AI: uses dropdown in separate "Default Settings" section

### 6. Display Mode in Appearance ✅ COMPLETE

**Goal**: Allow users to choose between wide and normal content width

Add to AppearanceSettingsTab:
- [x] New "Display Mode" section after theme selection
- [ ] Options: Wide (full width), Normal (constrained max-width)
- [x] Visual preview cards showing layout difference
- [x] Persist setting to localStorage
- [x] Apply to all main content areas (specs, sessions, etc.)

Implementation:
- [x] Create `useDisplayMode` store (like theme store)
- [x] Options: `wide` | `normal`
- [x] Default: `normal` (current behavior)
- [x] Update layouts to respect this setting

CSS: 
- Normal: `max-w-4xl mx-auto`
- Wide: `max-w-7xl mx-auto` or `w-full px-6`

## Non-Goals

- Complete redesign of provider/model data structure
- Adding new AI providers
- Runner execution functionality changes
- Mobile-first redesign (focus on desktop)

## Technical Notes

### Files Modified/Reviewed

- [packages/ui/src/layouts/SettingsLayout.tsx](packages/ui/src/layouts/SettingsLayout.tsx) - ✅ Sidebar redesign complete (icon-only collapse)
- [packages/ui/src/components/settings/AISettingsTab.tsx](packages/ui/src/components/settings/AISettingsTab.tsx) - ⚠️ Partial (registry-based, badges done)
- [packages/ui/src/components/settings/RunnerSettingsTab.tsx](packages/ui/src/components/settings/RunnerSettingsTab.tsx) - ⚠️ Basic implementation
- [packages/ui/src/components/settings/AppearanceSettingsTab.tsx](packages/ui/src/components/settings/AppearanceSettingsTab.tsx) - Theme/Language only
- [packages/ui/src/stores/display.ts](packages/ui/src/stores/display.ts) - ✅ Created

### Shared Components to Create

- `SettingsCard` - Consistent card component for list items
- `SearchFilterBar` - Reusable search/filter/sort component
- `DefaultStar` - Star button for default selection
- `StatusBadge` - Enhanced badge with icons (partially done via Badge component)

### API Considerations

- Add `/api/chat/config/validate` endpoint for API key validation
- Consider batching runner validation requests
- Implement validation result caching on backend

## Acceptance Criteria

1. ✅ Settings sidebar matches MainSidebar's icon-based collapse pattern
2. ⚠️ List items have consistent, professional design with icons (partial)
3. ❌ Users can search, filter, and sort models/runners
4. ❌ Validation status auto-refreshes on page load with visual feedback
5. ❌ Default selection is one-click with immediate visual feedback
6. ❌ Display mode toggle works and persists across sessions
7. ⚠️ All new strings are internationalized (for implemented features)
8. ✅ No regression in existing functionality

## Suggested Implementation Order (Remaining Work)

1. ~~Settings sidebar redesign (foundational)~~ - DONE
2. Display mode in appearance (quick win)
3. List item UI improvements (provider icons, action dropdown)
4. Search/filter/sort (functionality)
5. Streamlined default selection (star buttons)
6. Auto-detection for validation (backend + frontend)