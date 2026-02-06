---
status: planned
created: 2026-02-06
priority: high
tags:
- deployment
- docker
- production
- infrastructure
created_at: 2026-02-06T13:07:41.335047Z
updated_at: 2026-02-06T13:07:41.335047Z
---

# Docker Deployment for LeanSpec UI

## Overview

LeanSpec UI currently runs locally via the Rust HTTP server (`leanspec-http`) serving a Vite SPA, with all spec data read/written from the local filesystem. To support team-wide, self-hosted, and cloud deployments, we need a production-ready Docker image that solves the fundamental challenge: **how to give the containerized server access to project specs that live in Git repositories on developers' machines**.

## Design

### Architecture: Two Deployment Modes

**Mode 1: Volume-Mount (Single Machine / CI)**
- Mount host directories into the container as project sources
- Ideal for CI/CD pipelines, local Docker Compose setups, or single-server deployments
- Simple: `docker run -v /path/to/project:/projects/my-project leanspec-ui`

**Mode 2: Git-Repos Integration (Production / Team)**
- Container clones and periodically syncs Git repositories on startup
- Specs are read from cloned repos inside the container
- Supports multiple repos with configurable branches, SSH keys, and polling intervals
- Config via environment variables or a `repos.json` mount
- Webhook endpoint (`POST /api/hooks/git-sync`) to trigger pull on push events

### Container Architecture

```
┌─────────────────────────────────────┐
│           Docker Container          │
│  ┌──────────────┐  ┌────────────┐  │
│  │ leanspec-http│  │ git-sync   │  │
│  │ (Axum server)│  │ sidecar    │  │
│  │ :8080        │  │ (optional) │  │
│  └──────┬───────┘  └─────┬──────┘  │
│         │                │         │
│    ┌────▼────────────────▼────┐    │
│    │  /data/projects/         │    │
│    │  ├── repo-a/ (git clone) │    │
│    │  ├── repo-b/ (git clone) │    │
│    │  └── mounted/ (volume)   │    │
│    └──────────────────────────┘    │
│    ┌──────────────────────────┐    │
│    │  /data/leanspec/         │    │
│    │  ├── projects.json       │    │
│    │  └── config/             │    │
│    └──────────────────────────┘    │
└─────────────────────────────────────┘
```

### Key Design Decisions

1. **Single binary image** — Rust binary + pre-built UI assets, no Node.js runtime needed
2. **Auto-registration** — On startup, scan `/data/projects/` and register all directories containing a `specs/` folder
3. **Git-sync as optional sidecar process** — Keeps the core image simple; git-sync can be a separate entrypoint or a lightweight background process
4. **Config hierarchy** — Env vars → config file → defaults
5. **Read-only mode option** — For production viewers who shouldn't edit specs
6. **Health check** — `GET /api/health` for orchestrator liveness probes

### Git-Repos Configuration

```json
{
  "repos": [
    {
      "url": "git@github.com:org/project-a.git",
      "branch": "main",
      "syncInterval": 300,
      "specsDir": "specs/"
    }
  ],
  "auth": {
    "sshKeyPath": "/secrets/id_rsa",
    "gitCredentialHelper": "store"
  }
}
```

### Integration with Cloud Sync Bridge

The existing `leanspec-sync-bridge` can optionally run alongside Docker to stream specs from developer machines to the hosted instance — this is complementary to Git-repos mode and better suited for real-time collaboration scenarios.

## Plan

- [ ] Create multi-stage Dockerfile (build Rust binary + copy UI dist)
- [ ] Implement startup project scanner for `/data/projects/`
- [ ] Add git-sync entrypoint script (clone, register, poll)
- [ ] Add `repos.json` config parser and env var overrides
- [ ] Add webhook endpoint for git push-triggered sync
- [ ] Add read-only mode flag (`LEANSPEC_READ_ONLY=1`)
- [ ] Create `docker-compose.yml` with example configurations
- [ ] Add health check endpoint if not already present
- [ ] Write documentation for both deployment modes
- [ ] CI pipeline to build and push Docker image to GHCR

## Test

- [ ] Container starts and serves UI on `:8080` with volume-mounted project
- [ ] Git-repos mode clones repo and auto-registers project on startup
- [ ] Webhook triggers git pull and specs update via SSE
- [ ] Read-only mode prevents mutations through the API
- [ ] Health check returns 200 with version and project count
- [ ] Container restarts cleanly without data loss (persistent volume)
- [ ] Multi-repo setup works with mixed volume + git sources

## Notes

- Base image: `debian:bookworm-slim` or `alpine` (need to verify Rust binary compatibility with musl)
- The Rust binary is already cross-compiled for `linux-x64` in CI — we can reuse that artifact
- Consider `LEANSPEC_PROJECT_PATH` and `LEANSPEC_UI_DIST` env vars already supported by the server
- The sync bridge is a separate concern — document how to use it with Docker but keep it optional
- Future: Kubernetes Helm chart, but Docker Compose covers 80% of use cases first