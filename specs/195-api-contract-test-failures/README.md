---
status: complete
created: '2025-12-21'
priority: high
tags:
  - testing
  - api
  - contract
  - ci
  - parity
depends_on:
  - 194-api-contract-test-suite
  - 191-rust-http-api-test-suite
  - 186-rust-http-server
  - 192-backend-api-parity
created_at: '2025-12-21T14:11:18.442192Z'
updated_at: '2025-12-21T14:45:45.707Z'
transitions:
  - status: in-progress
    at: '2025-12-21T14:17:05.632Z'
  - status: complete
    at: '2025-12-21T14:45:45.707Z'
completed_at: '2025-12-21T14:45:45.707Z'
completed: '2025-12-21'
---

# API Contract Test Failures (Rust & Next.js)

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-12-21 · **Tags**: testing, api, contract, ci, parity


## Overview
Investigate and fix API contract suite regressions affecting both Rust HTTP server and Next.js API so the shared contract remains a reliable compatibility gate across backends and CI.

## Problem & Motivation
API contract suite (`pnpm -F @leanspec/api-tests test`) fails against both Rust HTTP server and Next.js API, blocking parity confidence and CI stability. Need a focused investigation to isolate regressions and ensure both backends satisfy the shared contract.

## Current Signals / Suspicions
- Failures observed when targeting Rust (port 3001) and Next.js (port 3000) backends.
- Potential drift in response schemas (camelCase vs snake_case) or missing fields.
- Fixture/seed differences between Rust and Next.js project loaders.
- Env/config mismatches for `API_BASE_URL`, project root, or filesystem permissions.

## High-Level Approach
- Reproduce failures for both backends with consistent fixtures and env.
- Triage by endpoint category: health, projects, specs, search, stats, dependencies, validate, error cases, performance envelopes.
- Compare live responses Rust vs Next.js for the failing cases to pinpoint schema/behavior drift.
- Patch minimal changes to bring both backends to the contract (prefer aligning to documented contract in tests/schemas).
- Harden test config and docs to avoid env drift (ports, project paths, seed data).

## Key Decisions
- Which backend is source of truth when behaviors diverge (align to contract or adopt parity to Next.js?).
- Scope of fixes allowed in Rust vs Next.js (behavior vs schema vs fixtures).
- Handling of performance thresholds and error payload shape (standardize or relax?).

## Plan
- Reproduce failing cases for both backends using the same fixtures and documented env vars.
- Categorize failures by endpoint and schema/behavior type; capture diffs Rust vs Next.js.
- Align implementations or adjust contracts to resolve each category, prioritizing minimal, backward-compatible fixes.
- Update troubleshooting guide and CI matrix configuration to lock in passing runs.

## Acceptance Criteria
- [x] Contract suite passes against Rust server (`API_BASE_URL=http://localhost:3001`).
- [x] Contract suite passes against Next.js API (`API_BASE_URL=http://localhost:3000`).
- [x] Documented reproduction steps and required env vars in `tests/api/README.md` (troubleshooting guide included).
- [x] If behavior gaps remain, tracked follow-ups with linked specs or issues.
- [x] CI matrix (Rust + Next) green or has explicit, justified allow-fail annotated.

## Implementation Notes
- Added automatic default-project registration in the Rust server and aligned project-scoped routes (specs, search, stats, deps, validate) with contract schemas, including stricter filter validation and dependency graph/stats shapes.
- Synced Next.js API to the contract with health/search endpoints, schema-aligned stats output, dependency 404 handling, and consistent project IDs for single-project mode.
- Documented test troubleshooting (ports, registry reset) in `tests/api/README.md`; contract suite now passes against both backends with `API_BASE_URL` pointing to 3001 (Rust) or 3000 (Next).

## Out of Scope
- New endpoints or OpenAPI generation.
- UI changes beyond test docs.
- Broader performance tuning outside test thresholds.

## Dependencies
- API contract suite spec and schemas.
- Rust/Next backend implementations and parity efforts.

## Open Questions
- Which port/base URL should be canonical for local CI? (3001 vs 3000)
- Do we standardize error payload structure across backends now or allow divergence?
- Is fixture seeding unified between Rust and Next.js flows?
