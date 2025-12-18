# Spec Split Plan

**Original**: 184-ui-packages-consolidation (7714 tokens 🔴)

**Reason**: Spec exceeded 5000 token threshold. Split into focused sub-specs for better context economy.

## Split Structure

```
184-ui-packages-consolidation (umbrella, ~1500 tokens)
├── 185-ui-components-extraction (~1800 tokens)
│   └── Extract shared React components library
├── 186-rust-http-server (~2000 tokens)
│   └── Build Axum HTTP server with multi-project support
└── 187-vite-spa-migration (~1500 tokens)
    └── Migrate Next.js SSR to Vite SPA

Total: ~6800 tokens (split efficiency: 88%)
```

## Sub-Spec Breakdown

### 185: UI Components Extraction
**Scope**: Create `packages/ui-components` shared library
- Extract components from packages/ui (Next.js)
- Extract components from packages/desktop (basic UI)
- Unify and upgrade to best-in-class components
- Export as tree-shakeable library

**Deliverables**:
- `packages/ui-components` package
- Storybook documentation
- Component tests

---

### 186: Rust HTTP Server
**Scope**: Build production-ready HTTP server
- Axum web framework setup
- Multi-project architecture
- Project registry integration (~/.lean-spec/projects.json)
- Configuration system (~/.lean-spec/config.json)
- REST API endpoints for all spec operations

**Deliverables**:
- `rust/leanspec-http` crate
- API documentation
- Integration tests

---

### 187: Vite SPA Migration
**Scope**: Replace Next.js with Vite SPA
- Vite + React + TypeScript setup
- API client for Rust HTTP server
- React Router for navigation
- Feature parity with Next.js UI

**Deliverables**:
- `packages/ui` (rewritten as Vite SPA)
- Desktop integration (uses same UI)
- E2E tests

---

## Migration Timeline

**Phase 1** (Week 1): 185 + 186 in parallel
**Phase 2** (Week 2): 187 (depends on 185 + 186)
**Phase 3** (Week 3): Desktop migration + testing
**Phase 4** (Week 4): Launch + deprecate old UI

## Dependencies

```
185 (components) ──┐
                   ├──> 187 (vite spa)
186 (http server) ─┘

184 (umbrella) depends on all
```

## Notes

- Original spec contained too much implementation detail
- Umbrella spec (184) now focuses on:
  - Motivation and problem statement
  - High-level architecture decisions
  - Cross-cutting concerns
  - Migration coordination
- Implementation details moved to sub-specs
- Each sub-spec is independently readable and actionable
