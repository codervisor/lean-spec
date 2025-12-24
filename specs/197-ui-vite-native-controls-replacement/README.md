---
status: planned
created: 2025-12-24
priority: medium
created_at: 2025-12-24T15:18:14.119002Z
updated_at: 2025-12-24T15:18:14.119002Z
---

## Overview

Native form controls remain in UI-Vite (buttons, toggle options) while the Next.js UI uses shadcn/ui primitives via @leanspec/ui-components. This creates styling inconsistencies and duplicated interaction logic. Known native usages:
- Filters: clear button in [packages/ui-vite/src/components/specs/SpecsFilters.tsx#L105](packages/ui-vite/src/components/specs/SpecsFilters.tsx#L105)
- Toggles/menus: theme toggle options in [packages/ui-vite/src/components/ThemeToggle.tsx#L20](packages/ui-vite/src/components/ThemeToggle.tsx#L20); language list entries in [packages/ui-vite/src/components/LanguageSwitcher.tsx#L50](packages/ui-vite/src/components/LanguageSwitcher.tsx#L50)
- Navigation lists: TOC items in [packages/ui-vite/src/components/spec-detail/TableOfContents.tsx#L33](packages/ui-vite/src/components/spec-detail/TableOfContents.tsx#L33); sub-spec tabs in [packages/ui-vite/src/components/spec-detail/SubSpecTabs.tsx#L97](packages/ui-vite/src/components/spec-detail/SubSpecTabs.tsx#L97); quick search trigger in [packages/ui-vite/src/components/QuickSearch.tsx#L132](packages/ui-vite/src/components/QuickSearch.tsx#L132)
- Editors: tag remove chip action in [packages/ui-vite/src/components/metadata-editors/TagsEditor.tsx#L65](packages/ui-vite/src/components/metadata-editors/TagsEditor.tsx#L65)
- Layout/utility: shortcuts close in [packages/ui-vite/src/components/Layout.tsx#L33](packages/ui-vite/src/components/Layout.tsx#L33); directory picker breadcrumb/list in [packages/ui-vite/src/components/projects/DirectoryPicker.tsx#L101-L148](packages/ui-vite/src/components/projects/DirectoryPicker.tsx#L101-L148)
- Project settings: back link and popover actions in [packages/ui-vite/src/pages/SettingsPage.tsx#L257](packages/ui-vite/src/pages/SettingsPage.tsx#L257) and [packages/ui-vite/src/pages/SettingsPage.tsx#L402-L441](packages/ui-vite/src/pages/SettingsPage.tsx#L402-L441)
- Board view: archived toggle buttons in [packages/ui-vite/src/components/specs/BoardView.tsx#L144](packages/ui-vite/src/components/specs/BoardView.tsx#L144) and [packages/ui-vite/src/components/specs/BoardView.tsx#L197](packages/ui-vite/src/components/specs/BoardView.tsx#L197)

Goal: align UI-Vite with shared shadcn/ui primitives, improving consistency, accessibility, and parity with the Next.js UI.

## Design

- Use @leanspec/ui-components primitives (Button, Select, Input, Command, Popover) for all form controls unless a semantic/native element is required for accessibility (e.g., true link vs button). 
- For tab-like or list-item interactions, prefer Button variants (ghost, link) or Command items to maintain keyboard focus and aria attributes. 
- Keep icon-only actions consistent with Button size/icon variants; ensure focus rings remain visible. 
- Avoid regressions in drag-and-drop areas (BoardView) by preserving draggable props while wrapping controls appropriately.

## Plan

- [ ] Finalize inventory of native controls in UI-Vite and map each to the appropriate @leanspec/ui-components primitive (Button/Command/Link) with accessibility notes.
- [ ] Replace native controls in filters, toggles, and menus (SpecsFilters, ThemeToggle, LanguageSwitcher, QuickSearch, TableOfContents, SubSpecTabs) with shared components and consistent aria labels.
- [ ] Update editors and utilities (TagsEditor, Layout shortcut modal, DirectoryPicker) to use Button variants while preserving keyboard navigation and scroll behaviors.
- [ ] Refactor SettingsPage project actions and BoardView archived toggles to use shared components; ensure popover/drag interactions remain intact.
- [ ] Run lint/typecheck and perform manual UI parity check against the Next.js implementation for the updated controls.

## Test

- [ ] pnpm -C packages/ui-vite typecheck
- [ ] Manual verify: filters (status/priority/tag clear), theme toggle, language switcher, quick search open/close, TOC navigation, sub-spec tab switching, tag removal, directory navigation, SettingsPage project actions, BoardView archived toggle.

## Notes

- Ensure any mentions of other specs are linked via lean-spec link if referenced later; current scope is standalone.
