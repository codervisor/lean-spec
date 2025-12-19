---
status: planned
created: 2025-12-19
priority: high
tags:
- ui
- rust
- backend
- parity
- api
depends_on:
- 187-vite-spa-migration
- 186-rust-http-server
- 191-rust-http-api-test-suite
- 192-backend-api-parity
- 193-frontend-ui-parity
created_at: 2025-12-19T06:25:19.956803Z
updated_at: 2025-12-19T06:36:24.922053Z
---

# UI-Vite Parity: Feature & Backend Alignment (Umbrella)

> Ensure @leanspec/ui-vite has identical UI/UX to @leanspec/ui with Rust HTTP backend feature parity
>
> **⚠️ Umbrella Spec**: Coordinates 3 sub-specs. See sub-specs for implementation details.

## Overview

**Problem**: Two UI implementations with significant discrepancies:
- **@leanspec/ui** (Next.js): Rich dashboard, sophisticated components, comprehensive features
- **@leanspec/ui-vite** (Vite SPA): Basic list views, missing many features, incomplete API integration

**Additionally**: Rust HTTP server missing critical API endpoints compared to Next.js API routes.

**Goal**: Achieve complete parity where:
1. **Rust HTTP server** has identical functionality to Next.js API routes
2. **@leanspec/ui-vite** has identical UI/UX to @leanspec/ui
3. Only difference: backend transport (Rust HTTP vs Next.js API routes)

## Sub-Specs

| Spec | Focus | Est. Time | Status |
|------|-------|-----------|--------|
| **[191](../191-rust-http-api-test-suite/)** | API test suite (prerequisite) | 5 days | planned |
| **[192](../192-backend-api-parity/)** | Backend API endpoints | 5 days | planned |
| **[193](../193-frontend-ui-parity/)** | Frontend UI components | 15 days | planned |

**Total**: ~25 days (5 weeks)

**Dependency Flow**:
```
191 (API Tests) → 192 (Backend API) → 193 (Frontend UI)
                     ↓
                   190 (This umbrella)
```

## Summary

### Gap Analysis

**Backend API Gaps** (see [Spec 192](../192-backend-api-parity/) for details):
- ❌ Metadata update endpoint (PATCH) - stubbed, not implemented
- ❌ Project discovery - no filesystem scanning
- ❌ Directory listing - no file browser API
- ❌ Context management APIs - no context file operations
- ❌ Project validation endpoint

**Frontend UI/UX Gaps** (see [Spec 193](../193-frontend-ui-parity/) for details):
- ❌ Dashboard page completely missing
- ❌ 30+ sophisticated components not ported
- ❌ Charts/visualizations missing
- ❌ Project management features incomplete
- ❌ Context page missing
- ⚠️ Many existing pages lack advanced features

**Testing Gap** (see [Spec 191](../191-rust-http-api-test-suite/) for details):
- ❌ No comprehensive API integration tests
- ❌ No error handling tests
- ❌ No multi-project scenario tests

## Design

See sub-specs for detailed implementation plans:
- [Spec 191](../191-rust-http-api-test-suite/) - API Testing infrastructure
- [Spec 192](../192-backend-api-parity/) - Backend endpoint implementation
- [Spec 193](../193-frontend-ui-parity/) - Frontend component porting

### High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│ Spec 191: API Test Suite (Foundation)          │
│ - Comprehensive integration tests               │
│ - Validates existing & new endpoints            │
│ - Prevents regressions                          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Spec 192: Backend API Parity                    │
│ - Metadata update (file writing)                │
│ - Project discovery (filesystem scan)           │
│ - Directory listing (file browser)              │
│ - Context management APIs                       │
│ - Project validation                            │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Spec 193: Frontend UI Parity                    │
│ - Port 30+ components from @leanspec/ui         │
│ - Create missing pages (Dashboard, Context)     │
│ - Add visualizations (charts, graphs)           │
│ - Achieve visual parity                         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Result: Complete Feature Parity                 │
│ @leanspec/ui-vite === @leanspec/ui              │
└─────────────────────────────────────────────────┘
```

### Success Criteria

**Must Have**:
- [ ] All sub-specs complete
- [ ] API test suite passing (191)
- [ ] All backend endpoints functional (192)
- [ ] All frontend components ported (193)
- [ ] End-to-end workflows working
- [ ] Zero regressions in existing features

**Should Have**:
- [ ] Performance: UI load < 2s for 100+ specs
- [ ] Performance: API response < 100ms
- [ ] Visual parity verified via screenshots
- [ ] Comprehensive documentation updated

**Nice to Have**:
- [ ] Performance benchmarks documented
- [ ] Migration guide for users
- [ ] Video walkthrough of new features

## Plan

### Overall Timeline (5 Weeks)

**Week 1: Testing Foundation**
- Work on [Spec 191](../191-rust-http-api-test-suite/)
- Set up comprehensive API test suite
- Validate existing endpoints

**Week 2: Backend API Implementation**
- Work on [Spec 192](../192-backend-api-parity/)
- Implement missing endpoints (metadata, discovery, directory listing)
- All tests passing

**Weeks 3-5: Frontend UI Implementation**
- Work on [Spec 193](../193-frontend-ui-parity/)
- Week 3: Core components (Dashboard, Sidebar, ToC, Search)
- Week 4: Advanced components (Dependency graph, Charts, Mermaid)
- Week 5: Polish and integration testing

### Coordination Points

**After Week 1**:
- Review API test coverage
- Identify any missed endpoints
- Adjust backend plan if needed

**After Week 2**:
- Verify all backend endpoints working
- Frontend can start integration with real APIs
- Update frontend plan based on API capabilities

**After Week 4**:
- Integration testing across all sub-specs
- Visual parity verification
- Performance testing

**Week 5 Final**:
- Bug fixes and polish
- Documentation updates
- Release coordination

## Test

**Testing Responsibility Distribution**:
- [Spec 191](../191-rust-http-api-test-suite/) - API integration tests
- [Spec 192](../192-backend-api-parity/) - Backend endpoint tests
- [Spec 193](../193-frontend-ui-parity/) - UI component and page tests

**Integration Testing** (this umbrella spec):
- [ ] End-to-end user workflows across backend + frontend
- [ ] Project discovery → Add → Switch → View specs
- [ ] Spec list → Detail → Edit metadata → Save
- [ ] Quick search → Navigate → View dependencies
- [ ] Stats dashboard → Charts → Filters
- [ ] Multi-project switching synchronized everywhere
- [ ] Performance: Page load < 2s, API response < 100ms
- [ ] Visual parity verification (screenshot comparison)

## Notes

### Why Split into Sub-Specs?

1. **Manageable Scope**: Each sub-spec is 1-2 weeks of focused work
2. **Clear Dependencies**: Test → Backend → Frontend is logical flow
3. **Parallel Work Possible**: After backend done, frontend can work independently
4. **Better Context Economy**: Each sub-spec stays under 2,000 tokens
5. **Easier Review**: Smaller chunks easier to review and validate

### Why Testing First?

**Critical prerequisite** (Spec 191):
- Validates current API behavior before changes
- Catches regressions immediately
- Serves as API documentation
- Provides confidence for refactoring
- Enables TDD for new endpoints

Without tests, we risk breaking existing functionality while adding new features.

### Work Sequencing

**Sequential Dependencies**:
- 191 (Tests) must complete before 192 (Backend)
- 192 (Backend) must complete before 193 (Frontend)

**Why?**
- Frontend needs working APIs to integrate against
- Backend changes need tests to validate correctness
- Can't port UI components without backend functionality

**Parallel Opportunities**:
- Frontend design/planning can happen during backend work
- Component extraction from @leanspec/ui can start early
- UI mockups and wireframes during week 1-2

### Related Specs

- [Spec 184](../184-ui-packages-consolidation/) - Parent umbrella (larger context)
- [Spec 186](../186-rust-http-server/) - Original Rust HTTP server (complete)
- [Spec 187](../187-vite-spa-migration/) - Vite SPA migration (in-progress)
- **[Spec 191](../191-rust-http-api-test-suite/)** - API testing (sub-spec)
- **[Spec 192](../192-backend-api-parity/)** - Backend API (sub-spec)
- **[Spec 193](../193-frontend-ui-parity/)** - Frontend UI (sub-spec)

## Implementation Log

### 2025-12-19: Spec Created
- Comprehensive analysis of API and UI/UX gaps
- Two-stream implementation plan (backend + frontend)
- 5-week timeline for complete parity
- Priority: HIGH - blocks ui-vite production readiness
