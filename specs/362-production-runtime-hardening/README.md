---
status: planned
created: 2026-03-09
priority: high
tags:
- cloud
- production
- infrastructure
- security
parent: 355-cloud-deployment-readiness
created_at: 2026-03-09T13:34:45.421845Z
updated_at: 2026-03-09T13:35:56.583758Z
---

# Production Runtime Hardening

## Overview

Harden the Axum HTTP server for production cloud environments with graceful shutdown, readiness probes, and resource limits.

## Design

### Graceful Shutdown

Cloud platforms send SIGTERM before killing containers (typically 10-30s grace).

- Handle SIGTERM/SIGINT with `tokio::signal`
- Drain in-flight HTTP requests before exiting
- Close SQLite connections cleanly
- Log shutdown sequence for observability

### Enhanced Health Checks

Cloud orchestrators need readiness probes to route traffic correctly.

- `GET /health/live` — simple liveness (always 200 if process is up)
- `GET /health/ready` — checks DB connectivity, returns 503 if not ready
- Keep existing `/health` as-is for backward compatibility

### Resource Limits

Prevent abuse and OOM in constrained cloud environments.

- `LEANSPEC_REQUEST_TIMEOUT` — per-request timeout (default: 30s)
- `LEANSPEC_MAX_REQUEST_SIZE` — body size limit (default: 5MB)
- Connection limit via tower middleware

## Plan

- [ ] Implement graceful shutdown with SIGTERM/SIGINT handling
- [ ] Add `/health/live` and `/health/ready` endpoints with DB check
- [ ] Add request timeout middleware
- [ ] Add body size limit middleware
- [ ] Add connection limit middleware

## Test

- [ ] SIGTERM causes clean shutdown with no dropped requests
- [ ] `/health/ready` returns 503 when DB is inaccessible
- [ ] `/health/live` returns 200 always
- [ ] Requests exceeding body size limit return 413
- [ ] Requests exceeding timeout return 408