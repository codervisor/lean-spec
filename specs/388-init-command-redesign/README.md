---
status: planned
created: 2026-05-14
priority: high
tags:
- cli
- init
- ux
- adapter
depends_on:
- "383-markdown-adapter-domain-isolation"
- "384-github-adapter"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# Init Command Redesign

## Overview

`leanspec init` currently only bootstraps markdown projects (creates `specs/`,
writes `AGENTS.md`, writes `.lean-spec/config.json`). After this spec it becomes
the entry point for any adapter:

```
leanspec init                    # markdown (unchanged)
leanspec init --adapter github   # GitHub Issues backend
leanspec init --adapter ado      # Azure DevOps (stub; full impl in spec 396)
leanspec init --adapter jira     # Jira (stub; full impl in spec 398)
```

Done when: a user can go from zero to a working GitHub-backed project using
only `leanspec init --adapter github`.

## Design

### `--adapter` flag

Added to `Commands::Init` in `cli_args.rs`. Default: `"markdown"` (existing
behavior preserved exactly).

### Markdown path (unchanged)

`leanspec init` with no `--adapter` flag or `--adapter markdown` behaves
identically to the current implementation. No regressions.

### GitHub init flow

```
$ leanspec init --adapter github

Initializing GitHub Issues adapter...

✓ Detected remote: github.com/acme/backend
  Owner: acme
  Repo:  backend

  Press Enter to use these, or type owner/repo: _

Checking GITHUB_TOKEN... ✓ found (47 chars)
Validating token against acme/backend... ✓ authenticated as @alice

Writing leanspec.adapter.yaml... ✓
Writing AGENTS.md... ✓

Done. Run `leanspec capabilities` to see available operations.
```

**Remote detection**: parse `git remote get-url origin`, extract owner/repo
from both HTTPS (`https://github.com/owner/repo.git`) and SSH
(`git@github.com:owner/repo.git`) formats. If detection fails or is wrong,
prompt for manual input.

**Token check**: read `$GITHUB_TOKEN`. If absent, print:
```
GITHUB_TOKEN not found in environment.
Set it and re-run, or export it now:

  export GITHUB_TOKEN=ghp_...

See https://docs.github.com/tokens for how to create one.
```

**Token validation**: call `GET /user` with the token. If it returns 401,
print an error and exit non-zero. If it returns 200 but the token lacks
`repo` scope (check `X-OAuth-Scopes` header), warn but proceed.

**No `specs/` scaffold**: do not create a `specs/` directory for non-markdown
adapters.

### `leanspec.adapter.yaml` format

```yaml
# Written by leanspec init --adapter github
adapter: github
settings:
  owner: acme
  repo: backend
  # token_env defaults to GITHUB_TOKEN; override if needed:
  # token_env: MY_CUSTOM_TOKEN_VAR
```

File is written to the project root (same directory as `package.json` or
detected project root). Safe to commit — no secrets.

### `AGENTS.md` template update

The existing `AGENTS.md` template written by `init` contains markdown-specific
instructions (e.g. "Never edit frontmatter manually", "Specs live in `specs/`").
These are removed for non-markdown adapters. A new adapter-agnostic template is
written instead:

```markdown
# LeanSpec — Agent Guide

This project uses LeanSpec for spec-driven development.

## Working with specs

- List: `leanspec list`
- View: `leanspec view <id>`
- Create: `leanspec create "Title"`
- Update: `leanspec update <id> --status in-progress`
- Search: `leanspec search "keyword"`

Run `leanspec capabilities` to see all available operations and fields.
```

The markdown-specific `AGENTS.md` template (with frontmatter guidance) is kept
for `--adapter markdown`.

### ADO and Jira stubs

`leanspec init --adapter ado` and `--adapter jira` print:

```
ADO adapter support coming soon.
Run `leanspec init --adapter github` or `leanspec init --adapter markdown`.
```

These stubs are replaced with full implementations in specs 396 and 398.

### `--adapter` in `cli_args.rs`

```rust
#[derive(Args)]
pub struct InitArgs {
    #[arg(long, default_value = "markdown")]
    pub adapter: String,

    /// For markdown: directory for spec files
    #[arg(long)]
    pub specs_dir: Option<String>,

    // existing flags preserved
}
```

## Plan

- [ ] Add `--adapter` flag to `InitArgs` in `cli_args.rs`
- [ ] `commands/init.rs`: branch on `params.adapter`
  - [ ] `"markdown"`: existing logic, untouched
  - [ ] `"github"`: new GitHub init flow
  - [ ] `"ado"` / `"jira"`: stub with "coming soon" message
  - [ ] anything else: error with list of valid adapters
- [ ] GitHub init flow implementation:
  - [ ] `detect_github_remote() -> Option<(String, String)>` (owner, repo)
  - [ ] `prompt_owner_repo(detected: Option<(String, String)>) -> (String, String)`
  - [ ] `check_github_token(token_env: &str) -> Result<String, CliError>`
  - [ ] `validate_github_token(token: &str, owner: &str, repo: &str) -> Result<(), CliError>`
  - [ ] `write_adapter_config(root: &Path, config: &AdapterYaml) -> Result<(), CliError>`
- [ ] Write new adapter-agnostic `AGENTS.md` template
- [ ] Update markdown `AGENTS.md` template to remove incorrect generic claims
- [ ] E2E test: `leanspec init --adapter github` with mocked HTTP produces correct files
- [ ] Ensure `leanspec init` (no flag) still produces identical output to current

## Test

- [ ] `leanspec init` (no flag): output identical to pre-spec behavior
- [ ] `leanspec init --adapter markdown`: same as above
- [ ] `leanspec init --adapter github` with valid `GITHUB_TOKEN` and detectable remote:
  - [ ] Creates `leanspec.adapter.yaml` with correct owner/repo
  - [ ] Creates `AGENTS.md` with adapter-agnostic content
  - [ ] Does NOT create `specs/` directory
- [ ] `leanspec init --adapter github` with missing `GITHUB_TOKEN`: clear error, exit 1
- [ ] `leanspec init --adapter github` with invalid token: clear error, exit 1
- [ ] `leanspec init --adapter ado`: "coming soon" message, exit 0
- [ ] `leanspec init --adapter unknown`: error listing valid adapters, exit 1
- [ ] After `leanspec init --adapter github`, `leanspec capabilities` runs successfully

## Notes

### Interactive vs non-interactive

Detect whether stdout is a TTY (`atty` crate or `std::io::IsTerminal`). In
non-interactive mode (CI, piped), skip prompts and use only what's detectable
or provided via flags. If required info is missing in non-interactive mode,
error with a helpful message.

### `leanspec.adapter.yaml` location

Written to the first directory containing `.git/` when searching up from cwd.
This matches how `AdapterRegistry::from_project()` locates the file.
