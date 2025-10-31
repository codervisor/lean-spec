# typescript-cli-migration

**Created**: 2025-10-31  
**Status**: Complete

## Goal

Migrate lean-spec CLI from bash script to TypeScript/pnpm while keeping the methodology language-agnostic. Better tooling for maintainability without sacrificing lean principles.

## Key Points

- CLI commands: `create`, `archive`, `list` with same UX
- Date-based structure: `specs/YYYYMMDD/NNN-name.md`
- Modern TS tooling: tsup, ESLint, Prettier
- Minimal dependencies: only `chalk` for colors
- Fast build with pnpm

## Non-Goals

What we're explicitly NOT doing:
- Adding complex CLI features or frameworks
- Over-engineering with unnecessary dependencies
- Making methodology TS-specific (stays language-agnostic)
- Breaking changes to command interface

## Notes

The bash version worked but lacked type safety and was harder to extend. TS provides better DX while keeping the tool lean (~200 lines of code).

LeanSpec methodology remains framework/language-agnostic - this is just the CLI implementation.
