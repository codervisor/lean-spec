# CLAUDE.md — codervisor project standards

This file defines shared conventions enforced across all codervisor repositories.
It is synced from the [codervisor meta-repo](https://github.com/codervisor/codervisor) into each child project.

## Repository overview

codervisor is a suite of AI-agent infrastructure projects:

| Repo | Stack | Purpose |
|------|-------|---------|
| stiglab | Rust + TypeScript | Distributed AI agent session orchestration |
| synodic | TypeScript | AI harness governance framework |
| telegramable | TypeScript | Telegram-first AI agent proxy |
| ising | Rust | Code graph analysis engine |
| skills | TOML / Markdown | Shared Claude Code skills |
| lean-spec | Lean 4 | Formal specification framework |

## Coding conventions

### General

- Write clear, self-documenting code. Add comments only where intent is non-obvious.
- Prefer small, focused commits with descriptive messages (imperative mood, <72 chars).
- Every PR must pass CI before merge. No force-pushing to `main`.
- Keep dependencies minimal. Justify new crates / packages in the PR description.

### Rust repos (stiglab, ising)

- Edition: 2021 or later.
- Format with `rustfmt` (default config unless `rustfmt.toml` is present).
- Lint with `clippy` — treat warnings as errors in CI (`-D warnings`).
- Use `thiserror` for library errors, `anyhow` for binary/application errors.
- Prefer `#[must_use]` on functions returning values that should not be silently dropped.
- Tests live next to the code in `#[cfg(test)]` modules; integration tests in `tests/`.

### TypeScript repos (synodic, telegramable)

- Target: ES2022+ / Node 20+.
- Strict mode: `"strict": true` in `tsconfig.json`.
- Lint with Biome (preferred) or ESLint. Format with Biome or Prettier.
- Use named exports. Avoid `default` exports except for framework conventions.
- Prefer `async/await` over raw Promises. Avoid `.then()` chains.
- Tests use Vitest (preferred) or Jest. Co-locate test files as `*.test.ts`.

### Lean repos (lean-spec)

- Follow Mathlib conventions for naming and style.
- Keep proofs tactic-mode where possible for readability.

## Commit messages

```
<type>: <short summary in imperative mood>

Optional body explaining *why*, not *what*.
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`.

## Branch naming

```
<type>/<short-description>
```

Examples: `feat/session-pool`, `fix/auth-timeout`, `chore/update-deps`.

## PR standards

- Title follows commit message format.
- Description includes a **Summary** (what and why) and **Test plan** (how it was verified).
- Keep PRs small and focused. Split large changes into stacked PRs.
- Request review from at least one team member.

## Security

- Never commit secrets, tokens, or credentials. Use environment variables.
- Validate all external input at system boundaries.
- Follow OWASP top-10 awareness for any web-facing code.
- Pin CI action versions to full SHA, not tags.

## Dependencies

- Rust: pin exact versions in `Cargo.toml` for binaries; use semver ranges for libraries.
- TypeScript: use a lockfile (`package-lock.json` or `pnpm-lock.yaml`). Commit it.
- Review dependency updates via Dependabot or Renovate PRs — don't auto-merge.
