---
status: planned
created: 2026-03-05
priority: high
tags:
- cloud
- deployment
- production
- infrastructure
- security
depends_on:
- 329-database-consolidation-multi-backend
created_at: 2026-03-05T05:23:18.233610402Z
updated_at: 2026-03-05T05:31:22.658851268Z
---
# Cloud Deployment Readiness

## Overview

Umbrella spec for making LeanSpec production-ready for cloud deployment and git-native usage. Covers server hardening, authentication, observability, platform configs, and git-native spec rendering for corporate/private repositories.

## Motivation

LeanSpec currently works well as a local development tool, but needs hardening for two cloud deployment models:

1. **Hosted Server** — Deploy the HTTP server on Railway, Fly.io, Render, etc. with proper auth, health checks, logging, and resource limits.
2. **Git-Native Rendering** — Display specs directly in git repositories (GitHub, GitLab, Bitbucket, corporate self-hosted) without requiring a running server, leveraging native markdown rendering.

The git-native approach is especially important for corporate environments with private repos where spinning up a separate server may not be feasible or desired.

## Child Specs

| Area | Spec | Description |
|------|------|-------------|
| Foundation | Configurable Data Directory | `LEANSPEC_DATA_DIR` env var, portable paths |
| Runtime | Production Runtime Hardening | Graceful shutdown, health checks, resource limits |
| Security | API Authentication Middleware | Bearer token auth for cloud endpoints |
| Observability | Cloud Observability & Logging | JSON logging, configurable log levels |
| Deployment | Cloud Platform Deploy Configs | Railway, Fly.io, Render configs + docs |
| Git | Git-Native Spec Rendering | Render specs in git repos for private/corporate use |

## Database Strategy

Uses **SQLite with persistent volumes** for cloud deployment — sufficient for single-instance deploys. For PostgreSQL/MySQL multi-backend support, see spec 329.

## Notes

- Docker image creation is covered by spec 317.
- The sync bridge (spec 213) is complementary — it syncs local specs to a hosted instance.
- Git-native rendering complements the hosted server model — teams choose based on their infrastructure constraints.