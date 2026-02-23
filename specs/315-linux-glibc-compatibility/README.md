---
status: complete
created: 2026-02-06
priority: high
tags:
- ci
- compatibility
- linux
- bugfix
created_at: 2026-02-06T13:11:18.891812585Z
updated_at: 2026-02-06T13:12:12.142637727Z
completed_at: 2026-02-06T13:12:12.142637727Z
transitions:
- status: complete
  at: 2026-02-06T13:12:12.142637727Z
---

# Fix Linux Binary GLIBC Compatibility

## Overview

Users on older Linux distributions (e.g., AliOS 7, kernel 4.19) cannot run the pre-built CLI binary because it requires `GLIBC_2.39`, which is only available on Ubuntu 24.04+. The binary is built on `ubuntu-latest` (now Ubuntu 24.04) in GitHub Actions, linking against the newer glibc.

Error: `GLIBC_2.39 not found (required by lean-spec)`

## Design

Pin the Linux build runner in `publish.yml` from `ubuntu-latest` to `ubuntu-22.04` (GLIBC 2.35). This is the simplest fix that broadens compatibility to most Linux distributions in active use.

**Why `ubuntu-22.04`?**
- GLIBC 2.35 is compatible with most modern Linux distros (Ubuntu 22.04+, Debian 12+, RHEL 9+, Fedora 36+)
- Still supported by GitHub Actions
- No code changes required — only CI configuration
- Alternative (musl static linking) would require more invasive changes

**Why not change `ci.yml`?**
- CI builds are for testing only, not distribution — `ubuntu-latest` is fine there

## Plan

- [x] Change Linux build runner in `publish.yml` from `ubuntu-latest` to `ubuntu-22.04`
- [ ] Verify fix in next release publish

## Test

- [x] CI workflow YAML is valid after change
- [ ] Next published Linux binary runs on systems with GLIBC 2.35+

## Notes

- Ref: GitHub Issue — 安装出现兼容问题
- `ubuntu-22.04` is expected to be supported through at least mid-2026
- Future consideration: `x86_64-unknown-linux-musl` target for fully static binaries (no glibc dependency at all)
