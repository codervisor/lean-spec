# Rust Code Quality Checks

## Overview

All Rust code must pass `cargo clippy -- -D warnings` before being merged. This ensures code quality and catches common issues early.

## Automated Checks

### Pre-Commit Hook
- **Triggers**: Every `git commit`
- **Actions**: 
  - Formats Rust code (`cargo fmt`)
  - Runs clippy checks
- **Result**: Commit blocked if clippy fails

### Pre-Push Hook
- **Triggers**: Every `git push`
- **Actions**: Runs full clippy validation
- **Result**: Push blocked if checks fail

### Pre-Release
- **Command**: `make pre-release` or `pnpm pre-release`
- **Includes**: Full validation including clippy

## Manual Commands

```bash
# Run clippy manually (recommended during development)
make rust-clippy
# or
pnpm lint:rust
# or
cargo clippy --manifest-path rust/Cargo.toml -- -D warnings

# Format Rust code
make rust-fmt
# or
cargo fmt --manifest-path rust/Cargo.toml

# Check formatting without changes
make rust-fmt-check
# or
cargo fmt --manifest-path rust/Cargo.toml -- --check
```

## AI Coding Workflow

When using AI assistants:

1. **Run clippy checks locally** before committing
2. **Let hooks catch issues** - don't bypass them
3. **Fix warnings immediately** - they become errors in CI
4. **Use `make rust-clippy`** for quick validation

## Common Issues

### Redundant Closures
```rust
// ❌ Bad
.unwrap_or_else(|| some_fn())

// ✅ Good
.unwrap_or_else(some_fn)
```

### Unused Variables
```rust
// ❌ Bad
let unused = 42;

// ✅ Good
let _unused = 42;  // or remove entirely
```

## CI Integration

The CI pipeline runs the same checks:
```yaml
- cargo clippy --manifest-path rust/Cargo.toml -- -D warnings
```

**Key Point**: Local hooks ensure you never push code that will fail CI.

## Bypassing Hooks (Emergency Only)

```bash
# Skip pre-commit (not recommended)
git commit --no-verify

# Skip pre-push (not recommended)
git push --no-verify
```

⚠️ Only bypass hooks if you have a specific reason and plan to fix issues immediately.
