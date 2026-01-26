---
status: complete
created: 2026-01-26
priority: high
tags:
- ui
- refactoring
- architecture
created_at: 2026-01-26T15:10:31.134517Z
updated_at: 2026-01-26T15:23:21.367936Z
completed_at: 2026-01-26T15:23:21.367936Z
transitions:
- status: complete
  at: 2026-01-26T15:23:21.367936Z
---

# Consolidate shadcn/ui and ai-elements Components into @leanspec/ui-components

## Overview

Currently, shadcn/ui components and ai-elements wrappers are scattered across packages:

- **@leanspec/ui-components**: 14 basic shadcn/ui components (Avatar, Badge, Button, Card, Command, Dialog, Input, Popover, Select, Separator, Skeleton)
- **@leanspec/ui**: 24+ shadcn/ui components (Accordion, Alert, Carousel, Dropdown, Tabs, Tooltip, etc.) + 47+ ai-elements wrappers (Agent, Artifact, CodeBlock, Conversation, Message, etc.)

This creates several issues:
1. **Code duplication** - shadcn/ui components split across packages
2. **Unclear boundaries** - @leanspec/ui-components doesn't contain all shared UI components
3. **Poor reusability** - Other packages can't easily use the full set of components
4. **Maintenance overhead** - Component updates need to happen in multiple places

The `@leanspec/ui-components` package was designed to be "Framework-agnostic, tree-shakeable UI components for LeanSpec" but it's incomplete.

## Design

### Target Architecture

**@leanspec/ui-components** should contain:
- All shadcn/ui base components (consolidated from both packages)
- All ai-elements wrappers
- LeanSpec-specific composed components (SpecCard, StatusBadge, etc.)
- Shared utilities and hooks

**@leanspec/ui** should contain:
- Application-specific pages and routing
- Application-level state management
- Feature-specific composed components
- Main app shell and layout

### Migration Strategy

1. **Phase 1: Consolidate shadcn/ui components**
   - Move all shadcn/ui components from @leanspec/ui to @leanspec/ui-components
   - Update imports in @leanspec/ui to use @leanspec/ui-components
   - Ensure no duplication (remove duplicates, keep most recent version)

2. **Phase 2: Move ai-elements wrappers**
   - Move ai-elements wrappers to @leanspec/ui-components
   - These are reusable React components that wrap ai-elements

3. **Phase 3: Update dependencies**
   - Ensure @leanspec/ui-components has all necessary peer dependencies
   - Update @leanspec/ui to depend on @leanspec/ui-components
   - Update other packages that might need these components

### Component List to Consolidate

**shadcn/ui components currently only in @leanspec/ui:**
- Accordion, Alert, ButtonGroup, Carousel, Collapsible
- DropdownMenu, HoverCard, InputGroup, Progress, ScrollArea
- Switch, Tabs, Textarea, Tooltip

**ai-elements wrappers (47 components):**
- All components in packages/ui/src/components/ai-elements/

## Plan

- [x] Audit current component distribution
- [x] Create consolidation spec
- [x] Move shadcn/ui components to @leanspec/ui-components
  - [x] Copy missing components from @leanspec/ui
  - [x] Remove duplicates (keep most recent versions)
  - [x] Export all components from @leanspec/ui-components/src/components/ui/index.ts
- [x] Move ai-elements wrappers to @leanspec/ui-components
  - [x] Create packages/ui-components/src/components/ai-elements/
  - [x] Move all 48 ai-elements wrapper components (via `npx shadcn@latest add @ai-elements/all`)
  - [x] Export from packages/ui-components/src/components/index.ts
- [x] Update dependencies
  - [x] Add missing peer dependencies to @leanspec/ui-components
  - [x] Update @radix-ui/* dependencies
  - [x] Add ai-elements as peer dependency
- [x] Update imports in @leanspec/ui
  - [x] Replace local ui component imports with @leanspec/ui-components imports
  - [x] Replace local ai-elements imports with @leanspec/ui-components imports
  - [x] Remove duplicate ai-elements directory from @leanspec/ui
- [x] Test and validate
  - [x] Build @leanspec/ui-components successfully
  - [x] Build @leanspec/ui successfully
  - [x] Build @leanspec/desktop successfully
  - [x] Full monorepo build passes
- [x] Clean up
  - [x] Remove old component files from @leanspec/ui
  - [x] Update component documentation
  - [x] Update package READMEs

## Test

- [x] @leanspec/ui-components builds without errors
- [x] @leanspec/ui builds without errors
- [x] No TypeScript errors in either package
- [x] Full monorepo builds successfully

## Notes

### Dependencies to Add

@leanspec/ui-components will need these additional dependencies:
- @radix-ui/react-accordion
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-progress
- @radix-ui/react-scroll-area
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-tooltip
- embla-carousel-react (for Carousel)

For ai-elements wrappers:
- ai-elements (peer dependency)
- @ai-sdk/react (peer dependency)
- Any other dependencies used by ai-elements wrappers

### Breaking Changes

This is a refactoring that shouldn't introduce breaking changes for external consumers:
- @leanspec/ui-components API expands (additive)
- @leanspec/ui internal structure changes but is not a library

### Future Considerations

After this consolidation, consider:
- Publishing @leanspec/ui-components as a standalone package for community use
- Creating comprehensive Storybook documentation
- Extracting more application-specific components from @leanspec/ui