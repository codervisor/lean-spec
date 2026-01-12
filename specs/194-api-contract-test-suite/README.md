---
status: complete
created: 2025-12-20
priority: high
tags:
- testing
- api
- typescript
- contract
- integration
depends_on:
- 191-rust-http-api-test-suite
- 186-rust-http-server
created_at: 2025-12-20T07:13:29.722091Z
updated_at: 2026-01-12T08:27:02.057474881Z
---
# API Contract Validation Test Suite

## Overview

Language-agnostic TypeScript suite that validates LeanSpec HTTP API contracts by issuing real HTTP requests against any configured server.

## Purpose

Provide enforceable API contracts, fast feedback, and implementation-agnostic validation to keep Rust/Next servers aligned.

## Goals

- Single source of truth for API contracts via Zod schemas
- Enforce required endpoints with schema validation (health, projects, specs, search, stats, dependencies, validation, errors, performance)
- Implementation-agnostic execution through configurable `API_BASE_URL`
- Fast, deterministic tests suitable for CI

## Scope

**Covered endpoints (project-scoped where applicable):**
- `/health`
- `/api/projects` and `/api/projects/:id`
- `/api/projects/:projectId/specs` and `/api/projects/:projectId/specs/:spec`
- `/api/search`
- `/api/projects/:projectId/stats`
- `/api/projects/:projectId/dependencies`
- `/api/projects/:projectId/validate`
- Error handling for 400/404 responses
- Performance envelopes for common endpoints

**Out of scope (tracked elsewhere):**
- OpenAPI generation
- UI integration
- Non-HTTP transports

## Architecture

- Location: `tests/api` standalone package (Vitest + TypeScript)
- Schemas: Zod definitions in `src/schemas` are the contract source of truth
- Client: lightweight fetch wrapper honoring `API_BASE_URL` (default `http://localhost:3001`)
- Fixtures: temporary on-disk projects/specs for isolated runs
- Tests: project-scoped suites covering schema validity, data correctness, errors, performance

## Acceptance Criteria

- [x] Schemas defined for all covered endpoints and re-exported centrally
- [x] Tests make real HTTP requests (no mocks) and validate against schemas
- [x] Health and search endpoints are enforced (fail if missing)
- [x] Default `API_BASE_URL` aligned across config, client, and docs (3001)
- [x] Suite is type-check clean and free of missing imports
- [x] Edge-case coverage: 500 errors, malformed JSON, invalid query params, empty projects, large (>100) specs
- [x] CI workflow runs contract suite (matrix for Rust/Next) with `API_BASE_URL` parameterized
- [x] Dependency correctness and search ranking assertions
- [ ] Troubleshooting guide added to README

## Current Test Coverage

- Health: availability + schema
- Projects: list/detail/create/update/delete (multi-project aware)
- Specs: list/detail with schema validation per item
- Search: required to respond 200 with schema-validated results
- Stats: project-level counts and shape validation
- Dependencies: graph shape and edge/node consistency
- Validation: project validation endpoint behavior
- Errors: 400/404 contract
- Performance: latency thresholds and concurrency handling for core endpoints

## Risks / Follow-ups

- Need realistic triggers for 500/malformed JSON cases without destabilizing servers
- Large dataset and dependency correctness tests require seeded fixtures and may extend runtime
- CI matrix not yet wired; must coordinate Rust/Next server startup

## Implementation Notes

- Aligned default `API_BASE_URL` to 3001 across Vitest config, client, and docs
- Removed skip logic for `/health` and `/api/search`; tests now fail if endpoints are absent
- Fixed missing `validateSchema` import in performance tests to keep type checks green
- Added edge-case coverage for malformed JSON, invalid params, empty/large projects, and enforced dependency/search correctness
- Added CI workflow matrix (Rust + Next, parameterized `API_BASE_URL`) at `.github/workflows/api-contract-tests.yml`

## Plan

- Land edge-case tests (500s, malformed/invalid payloads, large datasets)
- Add dependency correctness + search ranking assertions
- Wire GitHub Actions matrix for Rust/Next and surface coverage
- Document troubleshooting in `tests/api/README.md`

## Next Steps

1) Add troubleshooting guide to `tests/api/README.md`
2) Harden Next.js job once API parity is guaranteed (remove allow-failure)
