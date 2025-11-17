---
status: in-progress
created: '2025-11-17'
tags: []
priority: medium
created_at: '2025-11-17T06:07:38.678Z'
updated_at: '2025-11-17T06:11:38.816Z'
transitions:
  - status: in-progress
    at: '2025-11-17T06:11:38.816Z'
---

# spec-detail-ui-improvements

> **Status**: ⏳ In progress · **Priority**: Medium · **Created**: 2025-11-17

**Project**: lean-spec  
**Team**: Core Development

## Overview

The docs site's spec-detail experience currently blocks reviewers from scanning specs quickly, which is especially risky for the next release where we promised smoother UI/UX polish. Users reported seven consistent issues: sidebar refresh flicker after every spec switch, timeline panel overpowering the main content, TOC links that do nothing, HTML comment snippets leaking into the rendered markdown, `Updated` metadata stuck on `N/A`, distracting file icons in the nav, and no visual depiction of spec dependencies. These break Context Economy by forcing extra scrolling and erode trust in the data. We want this spec to be the single tracker for all near-release UI/UX fixes so we reclaim focus on the spec body, make navigation reliable, and expose relationship insights without jumping to other tools.

## Design

1. **Stable spec navigation**: cache the spec list response in the sidebar store, only update when metadata actually changes, and preserve scroll + active selection to avoid full re-renders during spec switches.
2. **Collapsible timeline**: move the timeline into a lightweight summary chip with a "Show Timeline" toggle that expands inline above metadata, defaulting to collapsed so the spec body stays the primary focus.
3. **TOC anchor fix**: normalize heading IDs on the client to match Docusaurus slug generation and rely on `scrollIntoView` plus URL hash updates so clicking TOC jumps to the correct section.
4. **Hide HTML comments**: preprocess markdown AST to drop `<!-- ... -->` nodes before rendering to stop internal guidance text from leaking.
5. **Accurate updated field**: surface `updated_at` from spec frontmatter, falling back to git modified time when absent, and ensure the detail query feeds the value through the API contract.
6. **Icon-less sidebar rows**: simplify the nav list item template to text-only to reduce noise and reclaim horizontal space for long titles.
7. **Dependencies visualization**: embed a compact relationship widget (start with badges showing `depends_on` and `related`; stretch goal is mini graph) so readers can see blockers without opening `lean-spec deps`.

## Plan

- [ ] Document current UI data flow for spec sidebar, detail header, and relationship sections
- [x] Implement navigation cache + scroll state persistence in sidebar component (SSR-safe and preserved during route loading)
- [x] Add collapsible timeline UI with persisted preference and action-style toggle controls
- [x] Keep spec navigation sidebar mounted while switching specs to avoid layout pop-in
- [x] Introduce shared action toggle pattern for secondary panels (timeline + dependencies) with highlight state
- [x] Fix TOC anchor generation and hash syncing, verify across nested headings
- [x] Strip HTML comments during markdown render pipeline
- [x] Plumb real `updated_at` values through API and UI
- [x] Remove file icons from sidebar rows and adjust spacing
- [x] Ship first iteration of dependency DAG view with precedence/connected naming and follow-up capture for richer charts

## Test

- [ ] Switching between multiple specs keeps sidebar state (selection + scroll) and the nav never disappears during route transitions
- [ ] Timeline action button defaults to collapsed, highlights only when expanded, and the step connectors stay horizontally aligned even when timestamps are missing
- [ ] Dependencies action button highlights on expansion, hides when collapsed, and renders the DAG with correct precedence/connected labels
- [ ] Clicking every TOC entry scrolls to the right heading and updates the URL hash
- [ ] Specs that contain `<!-- comment -->` sequences render without showing the comment text
- [ ] `Updated` value matches the spec metadata or git timestamp for recently edited specs without duplicating the created date pill
- [ ] Sidebar displays titles cleanly with no icons and adequate padding
- [ ] Dependency DAG lists accurate `depends_on` and `related` specs (nodes + edges) for at least two known specs

## Notes

- Timeline toggle placement candidates: above metadata vs within sidebar; validate with quick user test after prototype.
- Dependency chart options include lightweight badges now and cytoscape-style graph once token budgets allow.
