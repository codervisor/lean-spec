# Contributing to codervisor

## Standard operating procedures

### Getting started

1. Clone the meta-repo and all children:
   ```sh
   git clone git@github.com:codervisor/codervisor.git && cd codervisor
   npm i -g meta
   npm run clone
   ```
2. Work inside the relevant child repo directory.
3. Each child repo is an independent Git repository with its own branches and history.

### Development workflow

1. **Branch** from `main` using the naming convention: `<type>/<short-description>`.
2. **Commit** using conventional commits (enforced by the shared `commit-msg` hook).
3. **Push** your branch and open a PR against `main`.
4. **CI must pass** before requesting review.
5. **One approval required** before merge.
6. **Squash-merge** is the default merge strategy. Use merge commits only for long-lived feature branches.

### Running CI locally

**Rust repos:**
```sh
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
```

**TypeScript repos:**
```sh
npm ci
npm run lint
npm run typecheck
npm test
```

### Shared governance sync

The meta-repo distributes shared configuration into child repos:

| Command | What it syncs |
|---------|--------------|
| `npm run sync:ci` | `.github/workflows/` CI workflow files |
| `npm run sync:hooks` | `hooks/` directory (git hooks, Claude Code settings) |
| `npm run sync:claude` | `CLAUDE.md` project instructions |

After syncing, review the diff in each child repo before committing.

### Adding shared CI, hooks, or standards

1. Edit the relevant file in the meta-repo (e.g., `.github/workflows/ci-rust.yml`).
2. Run the corresponding sync script to push changes to children.
3. Open PRs in each affected child repo.

### Code review checklist

- [ ] CI passes (lint, typecheck, tests)
- [ ] Commit messages follow conventional format
- [ ] No secrets or credentials in the diff
- [ ] New dependencies are justified in the PR description
- [ ] Breaking changes are called out in the PR title with `!` (e.g., `feat!: ...`)
- [ ] Tests cover the new behavior

### Issue and PR triage

- Use labels consistently: `bug`, `enhancement`, `chore`, `documentation`, `question`.
- Link related issues in PR descriptions.
- Close stale issues after 30 days of inactivity with a comment.

### Release process

- Releases follow semver.
- Tag releases on `main` with `vX.Y.Z`.
- Rust crates: bump version in `Cargo.toml`, run `cargo publish`.
- npm packages: bump version in `package.json`, run `npm publish`.

### Security policy

- Report vulnerabilities privately via GitHub Security Advisories.
- Never commit secrets. Use `.env` files (gitignored) for local config.
- Pin all GitHub Actions to full commit SHAs.
- Review Dependabot / Renovate PRs promptly.
