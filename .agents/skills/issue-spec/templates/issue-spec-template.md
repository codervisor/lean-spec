<!-- Issue body template for lean-spec style spec issues on codervisor/lean-spec -->
<!-- Title: spec(<area>): <short description> -->
<!-- Labels: spec, <type>, area:<area>, priority:<level>, draft -->
<!-- Plus provider-impact if the change touches the provider seam -->
<!-- Plus i18n if the change adds or changes a user-visible string -->

## Overview

<!-- Problem statement and motivation. 2-4 sentences. Why does this matter? What's the impact of not doing it? Don't describe the solution here — that's Design's job. -->

## Design

<!-- Technical approach at intent level. Data flow, types, architecture decisions — not line-by-line code. Include what's explicitly OUT OF SCOPE. Respect lean-spec's invariants: provider-agnostic core, identical CLI/MCP/UI behavior across backends, i18n parity. -->

## Plan

- [ ] <!-- Verb + concrete deliverable -->
- [ ] <!-- Each item independently verifiable -->
- [ ] <!-- Order reflects implementation sequence -->
- [ ] <!-- If this adds user-visible strings: update locales/en.json AND locales/zh-CN.json -->

## Test

- [ ] <!-- Vitest unit test or Rust #[cfg(test)] module: file path + what it covers -->
- [ ] <!-- pnpm typecheck passes -->
- [ ] <!-- pnpm pre-push passes (typecheck + clippy) -->
- [ ] <!-- i18n parity verified, if applicable -->

## Provider impact

<!-- Required when this change touches the provider abstraction, the types in packages/ui/src/types/specs.ts, the provider trait in rust/leanspec-core/, or anything else externally observable across backends. Drop the section ONLY if the change provably touches no provider surface (e.g. docs-only edits, CI tweaks, repo hygiene). -->

- Types added / removed / renamed:
- Trait changes:
- markdown backend semantics:
- github backend semantics:
- Migration path:
- Breaking change?  yes / no — if yes, add a `CHANGELOG.md` entry on merge (the `provider-impact` label is applied regardless)

## Alignment

### Human decides
- [ ] <!-- Decision requiring judgment, context, or authority -->

### AI implements
- [ ] <!-- Concrete task tied to plan items above -->

### Open questions
<!-- Remove this subsection if none. Questions block draft → planned. -->

> <!-- Question with enough context to answer -->
> Impact: <!-- Which plan items are affected -->

## Notes

<!-- Tradeoffs, related issues (#N), references. Omit section if empty. If migrated from a legacy file-based spec, note the original path here. -->
