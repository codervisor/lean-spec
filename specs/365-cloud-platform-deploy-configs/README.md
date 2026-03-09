---
status: planned
created: 2026-03-09
priority: medium
tags:
- cloud
- deployment
- documentation
- devops
depends_on:
- 361-configurable-data-directory
- 362-production-runtime-hardening
- 363-api-authentication-middleware
parent: 355-cloud-deployment-readiness
created_at: 2026-03-09T13:35:13.950876Z
updated_at: 2026-03-09T13:36:02.376571Z
---

# Cloud Platform Deploy Configs

## Overview

Provide ready-to-use deployment configurations and documentation for popular cloud platforms so teams can deploy LeanSpec with minimal setup.

## Design

### Deploy Configs

- `railway.json` — Railway deployment config with volume mount
- `fly.toml` — Fly.io config with volume and health check
- `render.yaml` — Render blueprint with persistent disk
- `.env.example` — documented env var template with all `LEANSPEC_*` vars

### Documentation

- Cloud deployment guide in docs-site covering:
  - Platform comparison (Railway vs Fly.io vs Render)
  - Volume mount strategies for SQLite persistence
  - Environment variable reference
  - One-click deploy buttons where supported

## Plan

- [ ] Create `.env.example` with all env vars documented
- [ ] Create `railway.json` deploy config
- [ ] Create `fly.toml` deploy config
- [ ] Create `render.yaml` blueprint
- [ ] Add cloud deployment guide to docs-site
- [ ] Add deploy buttons to README where supported

## Test

- [ ] Railway config deploys successfully
- [ ] Fly.io config deploys successfully
- [ ] Render blueprint deploys successfully
- [ ] `.env.example` documents all `LEANSPEC_*` env vars