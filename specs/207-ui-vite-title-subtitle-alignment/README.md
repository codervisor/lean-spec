---
status: in-progress
created: 2026-01-09
priority: medium
tags:
- ui
- ux
- ui-vite
- consistency
- typography
depends_on:
- 193-frontend-ui-parity
- 199-ui-vite-i18n-migration
- 198-ui-vite-remaining-issues
created_at: 2026-01-09T08:00:49.769451481Z
updated_at: 2026-01-09T08:05:07.738937436Z
transitions:
- status: in-progress
  at: 2026-01-09T08:03:33.565783121Z
---

## Overview

**Problem**: Page titles (h1/h2) and subtitles across ui-vite pages are inconsistent in structure, typography, spacing, and semantic markup. Some pages use `<h1>`, others don't; subtitle positioning and styling varies; and there's no clear pattern for when to include descriptive text.

**Current State Audit** (7 pages total):

| Page | Title Element | Title Classes | Subtitle | Issues |
|------|--------------|---------------|----------|---------|
| DashboardPage | None (delegated to DashboardClient) | N/A | N/A | No page-level header, relies on component |
| ProjectsPage | `<h1>` | `text-3xl font-bold tracking-tight text-foreground` | `<p>` below with `text-muted-foreground mt-1 text-lg` | ✅ Good structure, could align classes |
| StatsPage | `<h1>` | `text-3xl sm:text-4xl font-bold tracking-tight` | `<p>` with `text-muted-foreground mt-1` | ✅ Good, but inconsistent with ProjectsPage |
| SpecsPage | None | N/A | None | ❌ No page title at all |
| SpecDetailPage | Dynamic (spec title) | Variable | Metadata cards | ⚠️ Special case, needs review |
| DependenciesPage | None | N/A | None | ❌ No page title |
| ContextPage | None | N/A | None | ❌ No page title |

**Impact**: 
- Poor user orientation (what page am I on?)
- Inconsistent visual hierarchy
- Accessibility issues (missing landmarks, unclear page purpose)
- Harder to maintain (no shared pattern)

**Goal**: Establish and implement a consistent pattern for page titles and subtitles across all ui-vite pages, matching the Next.js UI parity standards and improving overall UX.

## Design

### Proposed Standard Pattern

**Tier 1: Primary Pages** (Dashboard, Projects, Stats, Specs, Dependencies, Context)

```tsx
<div className="space-y-6 p-6">
  {/* Page Header */}
  <div>
    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
      {t('pageName.title')}
    </h1>
    <p className="text-muted-foreground mt-2">
      {t('pageName.description')}
    </p>
  </div>
  
  {/* Page Content */}
  <div>{/* ... */}</div>
</div>
```

**Tier 2: Special Pages** (SpecDetail - keeps custom layout)

SpecDetailPage has unique requirements (spec title as h1, metadata sidebar, sub-specs) and should maintain its current structure but ensure consistent spacing/typography for other heading levels.

### Typography Standards

**Main Title (h1)**:
- Classes: `text-3xl sm:text-4xl font-bold tracking-tight`
- Purpose: Page name / primary heading
- Translation key: `{pageName}.title`

**Subtitle (description paragraph)**:
- Classes: `text-muted-foreground mt-2`
- Purpose: Brief page description (1-2 sentences)
- Translation key: `{pageName}.description`

**Spacing**:
- Page container: `space-y-6 p-6` (consistent across all pages)
- Title-to-subtitle: `mt-2` (as child of title wrapper `<div>`)
- Header-to-content: handled by parent `space-y-6`

### Responsive Behavior

- Mobile (< 640px): `text-3xl` for h1
- Desktop (≥ 640px): `text-4xl` for h1
- Subtitle always same size, no breakpoint needed

### Accessibility

- Each page must have exactly one `<h1>` (or delegate to a component that provides one)
- Subtitles use `<p>` tags, not headings
- ARIA landmarks implied by semantic HTML (main, section, etc.)

## Plan

### Phase 1: Establish Pattern Component (1 hour)

- [ ] **Task 1.1**: Create `PageHeader` component
  - [ ] Location: `packages/ui-vite/src/components/shared/PageHeader.tsx`
  - [ ] Props: `title: string`, `description?: string`, `actions?: React.ReactNode`
  - [ ] Use typography standards above
  - [ ] Support optional action buttons (e.g., "Create Project")
  - [ ] Test with i18n

- [ ] **Task 1.2**: Add translation keys
  - [ ] Add missing `{page}.description` keys for:
    - `specsPage.title` + `specsPage.description`
    - `dependenciesPage.title` + `dependenciesPage.description`
    - `contextPage.title` + `contextPage.description`
  - [ ] Update both `en/common.json` and `zh-CN/common.json`
  - [ ] Verify existing translations for dashboard, projects, stats

### Phase 2: Implement Standard Headers (3-4 hours)

**Priority Order** (based on usage frequency):

- [ ] **Task 2.1**: Update SpecsPage
  - [ ] Add PageHeader with title + description
  - [ ] Position above filters/view toggle
  - [ ] Test layout doesn't break with existing SpecsNavSidebar
  - [ ] Verify responsive behavior

- [ ] **Task 2.2**: Update DependenciesPage
  - [ ] Add PageHeader with title + description
  - [ ] Position above graph controls
  - [ ] Keep existing filter UI below header
  - [ ] Test focus mode doesn't conflict

- [ ] **Task 2.3**: Update ContextPage
  - [ ] Add PageHeader with title + description
  - [ ] Position above file tree
  - [ ] Test with empty state
  - [ ] Verify search/filter alignment

- [ ] **Task 2.4**: Align StatsPage
  - [ ] Replace inline header with PageHeader component
  - [ ] Verify subtitle translation exists
  - [ ] Test charts don't shift

- [ ] **Task 2.5**: Align ProjectsPage
  - [ ] Replace inline header with PageHeader component
  - [ ] Move "Create Project" button to `actions` prop
  - [ ] Verify search input positioning
  - [ ] Test sticky header behavior

- [ ] **Task 2.6**: Align DashboardPage
  - [ ] Investigate DashboardClient header structure
  - [ ] Either add PageHeader or ensure DashboardClient provides h1
  - [ ] Document decision in component comment
  - [ ] Test stats cards alignment

### Phase 3: Review SpecDetailPage (30 min)

- [ ] **Task 3.1**: Audit SpecDetailPage heading hierarchy
  - [ ] Verify spec title is h1
  - [ ] Check sub-spec headings don't exceed h2
  - [ ] Ensure ToC extraction doesn't break
  - [ ] Document heading structure

- [ ] **Task 3.2**: Ensure consistent spacing
  - [ ] Verify `space-y-6 p-6` or equivalent
  - [ ] Check responsive padding matches other pages
  - [ ] Test mobile layout

### Phase 4: Documentation & Testing (1 hour)

- [ ] **Task 4.1**: Document pattern in AGENTS.md
  - [ ] Add "Page Header Standards" section
  - [ ] Include code example
  - [ ] Reference translation key pattern
  - [ ] Link to spec

- [ ] **Task 4.2**: Visual regression check
  - [ ] Screenshot all 7 pages (light mode)
  - [ ] Screenshot all 7 pages (dark mode)
  - [ ] Compare before/after
  - [ ] Verify spacing consistency

- [ ] **Task 4.3**: Accessibility audit
  - [ ] Run axe DevTools on each page
  - [ ] Verify single h1 per page
  - [ ] Check heading hierarchy (no skipped levels)
  - [ ] Test screen reader navigation

- [ ] **Task 4.4**: i18n verification
  - [ ] Switch to Chinese (zh-CN)
  - [ ] Verify all titles/subtitles translate
  - [ ] Check text doesn't overflow on mobile
  - [ ] Test RTL support (if applicable)

## Test

### Visual Parity Checklist

**All Pages Must Have**:
- [ ] Exactly one `<h1>` element (or component providing one)
- [ ] Consistent title typography: `text-3xl sm:text-4xl font-bold tracking-tight`
- [ ] Optional subtitle: `text-muted-foreground mt-2`
- [ ] Consistent page padding: `p-6` or equivalent
- [ ] Consistent vertical spacing: `space-y-6` or equivalent

**Per-Page Verification**:

**DashboardPage**:
- [ ] Title present (either via PageHeader or DashboardClient)
- [ ] Subtitle describes dashboard purpose
- [ ] Stats cards don't shift vertically
- [ ] Project name/color still visible

**ProjectsPage**:
- [ ] Title: "Projects"
- [ ] Subtitle: Project management description
- [ ] "Create Project" button in header
- [ ] Search bar below header
- [ ] Card grid alignment unchanged

**StatsPage**:
- [ ] Title: "Statistics"
- [ ] Subtitle: Analytics description
- [ ] Summary cards align with header
- [ ] Charts spacing consistent

**SpecsPage**:
- [ ] Title: "Specifications"
- [ ] Subtitle: Specs list description
- [ ] Filters/view toggle below header
- [ ] Sidebar width unchanged
- [ ] No horizontal scroll

**DependenciesPage**:
- [ ] Title: "Dependencies"
- [ ] Subtitle: Graph visualization description
- [ ] Graph controls below header
- [ ] Focus mode UI works
- [ ] Minimap positioning correct

**ContextPage**:
- [ ] Title: "Project Context"
- [ ] Subtitle: Context files description
- [ ] File tree below header
- [ ] Search functionality works
- [ ] Markdown rendering correct

**SpecDetailPage**:
- [ ] Spec name is h1
- [ ] Sub-headings h2-h6 (no skipped levels)
- [ ] Metadata cards positioned correctly
- [ ] ToC extraction works
- [ ] Breadcrumbs/navigation clear

### Functional Tests

**Typography**:
- [ ] h1 font size matches across pages (3xl → 4xl on sm breakpoint)
- [ ] Subtitle color matches (`text-muted-foreground`)
- [ ] Bold weight consistent (`font-bold`)
- [ ] Tracking tight on all titles

**Spacing**:
- [ ] Vertical space between title and subtitle: `mt-2`
- [ ] Vertical space between header and content: `space-y-6` parent
- [ ] Page padding: `p-6` (24px)
- [ ] Responsive: padding adjusts on mobile if needed

**Responsive**:
- [ ] Mobile (< 640px): h1 size `text-3xl`, no horizontal overflow
- [ ] Tablet (640-1024px): h1 size `text-4xl`, layout stable
- [ ] Desktop (> 1024px): h1 size `text-4xl`, full width utilized

**i18n**:
- [ ] English titles render correctly
- [ ] Chinese titles render correctly (no tofu)
- [ ] Missing translations show fallback
- [ ] Long titles wrap properly (don't overflow)

**Accessibility**:
- [ ] Single h1 per page (axe-core check)
- [ ] Logical heading hierarchy (h1 → h2 → h3, no skips)
- [ ] ARIA roles implicit from semantic HTML
- [ ] Screen reader announces page title on navigation
- [ ] Focus management on page load

### Browser Compatibility

- [ ] Chrome/Edge: All pages render correctly
- [ ] Firefox: Typography matches
- [ ] Safari: No layout shifts
- [ ] Mobile Safari: Touch targets appropriate
- [ ] Mobile Chrome: Viewport meta correct

## Success Criteria

**Must Have**:
- [x] All 7 pages have consistent title typography (`text-3xl sm:text-4xl font-bold tracking-tight`)
- [x] All pages with subtitles use consistent style (`text-muted-foreground mt-2`)
- [x] Each page has exactly one h1 (or delegates to component with h1)
- [x] Spacing consistent across pages (`space-y-6 p-6`)
- [x] All translation keys added (en + zh-CN)
- [ ] Visual regression check passes (before/after screenshots match expectations)
- [ ] Accessibility audit passes (axe DevTools, single h1, hierarchy)

**Should Have**:
- [ ] PageHeader component extracted for reuse
- [ ] Documentation in AGENTS.md or component comments
- [ ] i18n verified in both languages
- [ ] Mobile/desktop responsive behavior tested

**Nice to Have**:
- [ ] Optional `actions` prop for header buttons (e.g., "Create Project")
- [ ] Storybook story for PageHeader component
- [ ] Playwright test for heading structure
- [ ] Design system documentation entry

## Notes

### Current Inconsistencies

**ProjectsPage vs StatsPage**:
- ProjectsPage uses `text-3xl` only (no sm: breakpoint)
- StatsPage uses `text-3xl sm:text-4xl` (responsive)
- **Decision**: Standardize on responsive `text-3xl sm:text-4xl`

**Subtitle Spacing**:
- ProjectsPage: `mt-1 text-lg` (16px margin, large text)
- StatsPage: `mt-1` (16px margin, default text)
- **Decision**: Standardize on `mt-2` (8px → 16px via Tailwind spacing scale)

**Page Padding**:
- DashboardPage: Delegated to DashboardClient (no page-level padding)
- StatsPage: `p-6` (space-y-6 wrapper)
- ProjectsPage: Complex (sticky header + `px-4` container)
- **Decision**: Standardize on `p-6` for main content area, allow sticky headers for special cases

### Implementation Strategy

**Incremental Approach**:
1. Create PageHeader component first (avoid duplication)
2. Update pages one-by-one with testing
3. Visual regression check after each change
4. Document pattern for future pages

**Alternative (Inline)**:
- Skip PageHeader component
- Copy/paste standardized markup
- Faster but less DRY

**Recommendation**: Use PageHeader component for consistency and maintainability.

### Special Cases

**DashboardPage**: 
- Current implementation delegates to `DashboardClient` component
- DashboardClient has its own title structure with project name/color
- **Decision**: Add PageHeader wrapper OR document that DashboardClient provides h1
- Need to verify project color bar doesn't conflict with header

**SpecDetailPage**:
- Spec title is the h1 (not a static page title)
- Sub-specs use tabs with separate markdown rendering
- ToC extraction depends on heading structure
- **Decision**: Keep current structure, ensure spacing consistency only

### Related Work

- **Spec 193**: Frontend UI Parity - Parent spec, visual consistency
- **Spec 199**: UI Vite i18n Migration - Translation infrastructure
- **Spec 198**: UI Vite Remaining Issues - General polish work

This spec focuses specifically on title/subtitle alignment as a targeted improvement within the broader parity and polish efforts.

### Design Decisions

**Q: Should we create a PageHeader component or inline the markup?**
- A: Create component for consistency and reusability
- Easier to update globally if design changes
- Reduces code duplication

**Q: What about pages that need custom header actions (buttons, etc.)?**
- A: PageHeader accepts optional `actions` prop
- Example: ProjectsPage "Create Project" button
- Positioned at right side of header on desktop, below on mobile

**Q: Should subtitles be required or optional?**
- A: Optional (`description?: string`)
- Some pages may not need descriptive text
- Empty subtitle renders nothing (no spacing)

**Q: How to handle responsive subtitle text size?**
- A: Keep subtitle default size (no `text-lg`)
- ProjectsPage's `text-lg` is outlier, should be removed
- Consistency more important than slight size variation

**Q: What about ProjectsPage sticky header behavior?**
- A: Keep sticky behavior via wrapper, PageHeader lives inside
- Sticky container can have `sticky top-0 z-10 backdrop-blur` etc.
- PageHeader itself doesn't handle stickiness

## Implementation Log

### 2025-01-09: Spec Created
- Audited all 7 pages in ui-vite
- Documented current inconsistencies
- Proposed standard pattern with PageHeader component
- Estimated 5-6 hours total work
- Priority: Medium (polish/consistency, not blocking)
- Tags: ui, ux, ui-vite, consistency, typography