---
status: planned
created: 2025-11-03
tags: [ui, visualization, pm-tools]
priority: medium
---

# visualization-improvements

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-03

**Project**: lean-spec  
**Team**: Core Development

## Overview

After reviewing current visualization and PM commands, several design issues were identified that impact usability and intuition:

1. **Timeline and Stats Overlap** - `timeline` and `stats` commands may have overlapping functionality that confuses users
2. **Basic Gantt Chart** - Current `gantt` implementation is very basic and could be more useful
3. **Unintuitive Status Icons** - Emoji icons for spec status are not immediately clear
4. **Priority Colors Misaligned** - Color coding for priority is counterintuitive (orange for medium, yellow for high)

## Design

### 1. Timeline vs Stats Analysis
- Review both commands to identify overlaps
- Define clear use cases for each
- Consider merging or refactoring to eliminate confusion

### 2. Gantt Chart Enhancement
- Add date ranges visualization
- Show dependencies between specs
- Include progress indicators
- Consider milestone markers

### 3. Status Icon Improvements
**Current Issues:**
- Icons not self-explanatory
- Need better visual differentiation

**Proposed:**
- Review and update status emoji mapping
- Ensure icons are intuitive at a glance
- Consider color coding or symbols that are universally understood

### 4. Priority Color Refinement
**Current (counterintuitive):**
- Orange → Medium
- Yellow → High

**Proposed (intuitive):**
- Green → Low
- Yellow → Medium  
- Orange → High
- Red → Critical

Aligns with common traffic light / alert level conventions.

## Plan

- [ ] Audit `timeline` and `stats` commands for functional overlap
- [ ] Define distinct purposes or merge functionality
- [ ] Research better status emoji/icon options
- [ ] Update status icon mapping
- [ ] Revise priority color scheme to intuitive model
- [ ] Enhance `gantt` command with date ranges and dependencies
- [ ] Update tests for affected commands
- [ ] Update documentation

## Test

- [ ] All visualization commands produce clear, distinct outputs
- [ ] Priority colors follow intuitive scheme (green→yellow→orange→red)
- [ ] Status icons are immediately recognizable
- [ ] Gantt chart displays meaningful timeline information
- [ ] No confusion between timeline and stats purposes
- [ ] Visual tests confirm color rendering

## Notes

### Files to Review
- `src/commands/stats.ts` - Stats command implementation
- `src/commands/timeline.ts` - Timeline command implementation
- `src/commands/gantt.ts` - Gantt chart implementation
- `src/commands/board.ts` - Board command (may have status icons)
- `src/components/StatsDisplay.tsx` - Stats UI component
- Color/icon constants likely in utils or config

### Considerations
- Maintain backward compatibility where possible
- Consider user configuration for color preferences
- Document reasoning for icon/color choices
- Get feedback on visual changes before finalizing
