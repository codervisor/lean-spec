---
status: planned
created: 2026-03-09
priority: high
tags:
- cloud
- infrastructure
- configuration
parent: 355-cloud-deployment-readiness
created_at: 2026-03-09T13:34:27.206645Z
updated_at: 2026-03-09T13:35:56.565769Z
---

# Configurable Data Directory

## Overview

The hardcoded `~/.lean-spec/` path is the biggest blocker for cloud deployment — cloud containers have ephemeral filesystems and need configurable storage paths.

## Design

- Add `LEANSPEC_DATA_DIR` env var (overrides `~/.lean-spec/`)
- All paths (DB, config, sync state) resolve relative to this directory
- Falls back to `~/.lean-spec/` when unset (backward compatible)
- Document persistent volume mount strategy for each cloud platform

## Plan

- [ ] Add `LEANSPEC_DATA_DIR` env var parsing in config module
- [ ] Refactor all path resolution to use configurable base dir
- [ ] Ensure DB, config, and sync state all respect the new base
- [ ] Add integration test for custom data dir

## Test

- [ ] Server starts with `LEANSPEC_DATA_DIR=/tmp/test` and creates DB there
- [ ] Default behavior unchanged when env var is unset
- [ ] All file paths (DB, config, sync) resolve under custom dir