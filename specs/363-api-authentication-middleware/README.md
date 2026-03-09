---
status: planned
created: 2026-03-09
priority: high
tags:
- cloud
- security
- authentication
- middleware
parent: 355-cloud-deployment-readiness
created_at: 2026-03-09T13:34:57.187957Z
updated_at: 2026-03-09T13:35:56.601877Z
---

# API Authentication Middleware

## Overview

All `/api/*` endpoints are currently public — anyone with the URL can read/write specs. Cloud deployments need authentication to prevent unauthorized access.

## Design

- Add `LEANSPEC_API_KEY` env var for bearer token auth
- Middleware checks `Authorization: Bearer <key>` header on all `/api/*` routes
- Skip auth for health endpoints (`/health`, `/health/live`, `/health/ready`)
- When no key is set, server runs unauthenticated (local dev mode)
- Return 401 with JSON error body for unauthorized requests
- Use constant-time comparison to prevent timing attacks

## Plan

- [ ] Add `LEANSPEC_API_KEY` env var support in config
- [ ] Implement auth middleware with bearer token validation
- [ ] Apply middleware to `/api/*` routes only
- [ ] Add constant-time string comparison for token check
- [ ] Return proper 401 JSON responses

## Test

- [ ] Requests without valid API key return 401 when `LEANSPEC_API_KEY` is set
- [ ] Requests with valid bearer token succeed when key is set
- [ ] Requests succeed without auth when `LEANSPEC_API_KEY` is unset
- [ ] Health endpoints bypass auth
- [ ] Invalid token format returns 401