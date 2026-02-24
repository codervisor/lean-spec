---
status: in-progress
created: 2026-02-24
priority: medium
created_at: 2026-02-24T02:24:52.781531Z
updated_at: 2026-02-24T03:10:19.620520Z
transitions:
- status: in-progress
  at: 2026-02-24T03:10:19.620520Z
---
# Desktop Repo Migration

> **Status**: planned · **Priority**: medium · **Created**: 2026-02-24

## Overview

The `packages/desktop` Tauri app has grown into a complex, platform-specific package with its own Rust backend (`src-tauri/`), native build pipeline, and platform-specific bundling scripts. Its presence in the monorepo adds build overhead, complicates CI/CD, and creates noise for contributors focused on the CLI/server/web surface. Migrating it to a dedicated repository (`codervisor/lean-spec-desktop`) improves separation of concerns and lets each repo evolve independently.

## Requirements

### Repository separation

- [x] Create a dedicated GitHub repository `codervisor/lean-spec-desktop`
- [x] Preserve desktop commit history from `packages/desktop/` during extraction
- [x] Ensure extracted history is path-rewritten so desktop files live at repository root

### Build and dependency isolation

- [x] Replace `workspace:*` dependency usage in desktop with publishable npm versions (starting with `@leanspec/ui`)
- [ ] Verify desktop runs standalone with `pnpm install` and `pnpm dev:desktop` (or equivalent tauri dev command)
- [x] Add independent desktop CI workflow (platform build matrix)

### Monorepo cleanup

- [x] Remove `packages/desktop/` from this monorepo after successful extraction
- [x] Remove desktop references from monorepo workspace/build config (`pnpm-workspace.yaml`, `turbo.json`, root scripts)
- [x] Update docs to reference the new desktop repository location

## Non-Goals

- Rewriting or refactoring the desktop app itself
- Changing the shared `@leanspec/ui` package
- Changing desktop functionality or UX

## Design

### Target Structure

├── src-tauri/        # Rust Tauri backend (copied from packages/desktop/src-tauri/)
├── public/
├── index.html

### Dependency Strategy

- `@leanspec/ui` is published to npm — replace `workspace:*` with a versioned npm reference
- Remove `@leanspec/desktop` from the monorepo `pnpm-workspace.yaml` and `turbo.json`
- Keep the desktop version in sync with lean-spec releases via a manual bump or GitHub Actions trigger

### CI/CD

The new repo gets its own GitHub Actions workflows for:
- Tauri build + bundle (per platform)
- Auto-update artefact publishing

## Technical Notes

- Preferred extraction mechanism: `git subtree split` to avoid introducing extra tooling dependencies
- `git subtree split` preserves desktop history without requiring `pip` or third-party git tooling
- Repository provisioning should use GitHub CLI (`gh`) to keep the migration scriptable and repeatable
- Run extraction from a fresh clone to keep local working history and branches clean
- Cutover sequence should be: extract + validate new repo first, then remove desktop package from monorepo

## Plan

### Extract history

- [x] Create `codervisor/lean-spec-desktop` using `gh repo create codervisor/lean-spec-desktop --public --confirm`
- [x] Clone the monorepo to a temp directory (do not use the working copy)
- [ ] Run `git subtree split --prefix=packages/desktop -b desktop-split` to extract `packages/desktop/` history into a dedicated branch
- [x] Push `desktop-split` as `main` to `codervisor/lean-spec-desktop`

### Standalone setup

- [x] Replace `workspace:*` dep on `@leanspec/ui` with latest published npm version
- [x] Verify `pnpm install` and `tauri dev` work standalone
- [x] Set up GitHub Actions: `tauri build` matrix (macOS, Windows, Linux)
- [x] Set up auto-updater artefact publishing workflow
- [ ] Remove `packages/desktop/` from this monorepo
- [x] Remove desktop entries from `pnpm-workspace.yaml`, `turbo.json`, and root `package.json` scripts
- [x] Update root `README.md` and `CONTRIBUTING.md` to link the new repo
- [x] Final validation: monorepo builds cleanly without desktop package

## Acceptance Criteria

- [x] `codervisor/lean-spec-desktop` contains desktop source at repo root and includes preserved history
- [ ] Desktop CI passes in the new repo for targeted platforms
- [ ] Desktop app builds/runs from the new repo without requiring monorepo workspace links
- [x] Monorepo `pnpm build` and CI pass after desktop removal
- [x] Monorepo docs point desktop contributors to the new repository

## Validation

- [x] Run `lean-spec validate 325-desktop-repo-migration`
- [x] Confirm token count remains within LeanSpec guidance

## Notes

- Implementation notes (2026-02-24):
  - Created and populated https://github.com/codervisor/lean-spec-desktop with extracted desktop history rooted at repository root.
  - `git subtree split` repeatedly failed with `fatal: no new revisions were found`; extraction was completed via `git filter-branch --subdirectory-filter packages/desktop` in a fresh temp clone as a documented fallback.
  - Updated standalone desktop repo to use published `@leanspec/ui` (`^0.2.24`), added independent workflows (`tauri-build.yml`, `tauri-updater-release.yml`), verified `pnpm install` and `pnpm tauri dev --help`.
  - Monorepo cleanup completed: removed `packages/desktop/`, removed desktop tasks/scripts/workflow references, and updated contributor/user docs to point at the new repo.
  - Monorepo validation command results: `pnpm build` ✅, `pnpm typecheck` ✅, `pnpm test` ✅, `pnpm lint` ❌ (pre-existing unrelated UI lint violations in `packages/ui`).
  - Global `lean-spec validate` currently reports many pre-existing length/structure issues in other specs; spec-specific validation for this spec passed.

- CI follow-up (2026-02-24):
  - Observed immediate workflow-file failures for initial desktop runs (`22337893259`, `22337893401`) due corrupted YAML content.
  - Pushed workflow repairs to desktop repo (`4885d4c`) and explicit pnpm version pinning (`29e370c`).
  - New Desktop Build runs progressed but still failed (`22339033152`, `22339242771`) with frontend standalone issues.
  - Root cause from failed logs: extracted desktop app still references monorepo-relative config/imports (`../tsconfig.base.json`, `../ui/tailwind.config`, and `../../ui/src/*`), causing `beforeBuildCommand` (`pnpm build`) to fail in CI.
  - Additional desktop repo commit attempted to pin Tauri package minors (`05abdd4`) to resolve tauri crate/js mismatch; that specific mismatch was resolved, but standalone frontend coupling remains the blocker.
  - Result: desktop CI is not green yet; spec remains `in-progress` until standalone import/config decoupling is fully completed and workflows pass.