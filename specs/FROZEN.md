# FROZEN — Historical Spec Snapshot

This directory is a **frozen historical snapshot** of pre-migration specs.
**Do not add or modify files here.**

## Where new specs go

New specs are GitHub Issues on
[`codervisor/lean-spec`](https://github.com/codervisor/lean-spec/issues),
following the spec methodology in
[`AGENTS.md`](../AGENTS.md) and the `issue-spec` skill.

## Why freeze instead of delete

The 304 specs that remain here are completed or archived work whose
context still has value (rationale, design decisions, lessons learned).
Git history preserves them, but keeping them browsable on disk avoids
making readers fetch arbitrary past commits.

## Enforcement

A pre-commit hook (`.husky/pre-commit`) and a CI job (`.github/workflows/ci.yml`
→ `freeze-specs`) block any **addition or modification** under `specs/`.
Deletions are allowed (cleanup is fine). Override the hook with
`--no-verify` only if you have a good reason.
