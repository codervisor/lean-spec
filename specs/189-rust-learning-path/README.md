---
status: complete
created: 2025-12-19
priority: medium
tags:
- learning
- rust
- documentation
- education
created_at: 2025-12-19T01:45:10.878889Z
updated_at: 2026-01-16T07:28:48.993437Z
---
# Learning Rust Through LeanSpec Codebase

## Overview

A structured learning path for understanding Rust by exploring the LeanSpec Rust implementation, which was built by AI agents. This spec serves as a guided tour through real-world Rust code, explaining concepts in order of complexity.

## Context

The LeanSpec Rust codebase (`rust/`) contains:
- **leanspec-core**: Core library with types, parsers, validators, and utilities
- **leanspec-cli**: Command-line interface
- **leanspec-mcp**: MCP (Model Context Protocol) server
- **leanspec-http**: HTTP server

This code was AI-generated and represents practical, production-quality Rust that you can learn from.

## Learning Path

### Phase 1: Rust Fundamentals (Week 1-2)

#### 1.1 Basic Types & Ownership
**Start here:** [rust/leanspec-core/src/types/spec_info.rs](rust/leanspec-core/src/types/spec_info.rs)

**Concepts to learn:**
- Structs and enums (`SpecInfo`, `SpecStatus`, `Priority`)
- Ownership and borrowing (why `&str` vs `String`)
- Derive macros (`#[derive(Debug, Clone, Serialize)]`)
- Option types (`Option<String>`, `Option<DateTime<Utc>>`)

**Questions to explore:**
- Why use `Option<T>` instead of null?
- When to use `&str` vs `String`?
- What does `#[serde(rename = "...")]` do?

#### 1.2 Error Handling
**Next:** [rust/leanspec-core/src/types/mod.rs](rust/leanspec-core/src/types/mod.rs)

**Concepts to learn:**
- Result type (`Result<T, E>`)
- Error types with `thiserror` crate
- The `?` operator for error propagation
- Custom error types

**Questions to explore:**
- How does `thiserror` simplify error handling?
- What's the difference between `unwrap()`, `expect()`, and `?`?
- How do errors propagate up the call stack?

#### 1.3 Module System
**Study:** [rust/leanspec-core/src/lib.rs](rust/leanspec-core/src/lib.rs)

**Concepts to learn:**
- `mod` declarations
- Public vs private APIs (`pub`, `pub(crate)`)
- Re-exporting (`pub use`)
- Module organization

**Questions to explore:**
- How does Rust's module system differ from JavaScript/TypeScript?
- What's the purpose of `lib.rs` vs `main.rs`?
- How do you make internal types public?

### Phase 2: Working with Data (Week 3-4)

#### 2.1 Serialization/Deserialization
**Study:** [rust/leanspec-core/src/parsers/frontmatter.rs](rust/leanspec-core/src/parsers/frontmatter.rs)

**Concepts to learn:**
- Serde framework for JSON/YAML
- Parsing strategies (manual vs derive)
- Working with unstructured data
- Validation during deserialization

**Questions to explore:**
- How does serde work its "magic"?
- What's the difference between `Serialize` and `Deserialize`?
- How do you handle optional/missing fields?

#### 2.2 File System Operations
**Study:** [rust/leanspec-core/src/utils/file_ops.rs](rust/leanspec-core/src/utils/file_ops.rs) (if exists) or search for file operations

**Concepts to learn:**
- `std::fs` and `std::path`
- `walkdir` for recursive traversal
- Path handling (`Path`, `PathBuf`)
- Error handling for I/O

**Questions to explore:**
- Why use `PathBuf` vs `Path`?
- How does Rust handle cross-platform paths?
- What's the best practice for reading/writing files?

#### 2.3 Collections & Iterators
**Study:** Search for `Vec`, `HashMap`, `.iter()`, `.map()` usage

**Concepts to learn:**
- Common collections (`Vec`, `HashMap`, `HashSet`)
- Iterator patterns (`.iter()`, `.into_iter()`, `.iter_mut()`)
- Functional programming (`.map()`, `.filter()`, `.collect()`)
- Iterator chaining

**Questions to explore:**
- When to use `iter()` vs `into_iter()`?
- How do iterators achieve zero-cost abstraction?
- What's the difference between `for x in vec` vs `for x in &vec`?

### Phase 3: Advanced Patterns (Week 5-6)

#### 3.1 CLI Development
**Study:** [rust/leanspec-cli/src/main.rs](rust/leanspec-cli/src/main.rs)

**Concepts to learn:**
- Command-line parsing with `clap`
- Derive macros for CLI (`#[derive(Parser)]`)
- Subcommands and arguments
- Interactive prompts with `dialoguer`

**Questions to explore:**
- How does clap generate help text automatically?
- What's the derive macro approach vs builder pattern?
- How do you handle user input safely?

#### 3.2 Async Programming
**Study:** [rust/leanspec-mcp/src/main.rs](rust/leanspec-mcp/src/main.rs)

**Concepts to learn:**
- `async`/`await` syntax
- Tokio runtime
- Async I/O (stdin/stdout)
- Concurrent operations

**Questions to explore:**
- How does async Rust differ from JavaScript Promises?
- What's the role of the runtime (Tokio)?
- When to use async vs sync code?

#### 3.3 Graph Algorithms
**Study:** [rust/leanspec-core/src/utils/dependency_graph.rs](rust/leanspec-core/src/utils/dependency_graph.rs) or search for `petgraph`

**Concepts to learn:**
- Graph data structures
- Using `petgraph` library
- Topological sorting
- Cycle detection

**Questions to explore:**
- How do you represent directed graphs in Rust?
- What algorithms does petgraph provide?
- How do you detect circular dependencies?

### Phase 4: Production Quality (Week 7-8)

#### 4.1 Testing
**Study:** Files in `tests/` directories

**Concepts to learn:**
- Unit tests (`#[cfg(test)]`, `#[test]`)
- Integration tests (in `tests/` folder)
- Assertion macros (`assert!`, `assert_eq!`)
- Test fixtures with `tempfile`

**Questions to explore:**
- Where do unit vs integration tests go?
- How do you test file operations?
- What's `pretty_assertions` for?

#### 4.2 Performance & Optimization
**Study:** [rust/Cargo.toml](rust/Cargo.toml) `[profile.release]` section

**Concepts to learn:**
- Release profiles
- LTO (Link-Time Optimization)
- Binary size optimization
- Performance profiling

**Questions to explore:**
- What do `lto = true` and `opt-level = "z"` do?
- Why strip symbols in release builds?
- How to measure performance?

#### 4.3 Cross-Platform Distribution
**Study:** [rust/npm-dist/](rust/npm-dist/) wrapper scripts

**Concepts to learn:**
- Cross-compilation
- npm integration for Rust binaries
- Platform-specific binary selection
- Distribution strategies

**Questions to explore:**
- How do you distribute Rust binaries via npm?
- What's the wrapper script pattern?
- How to handle different architectures?

## Learning Resources by Concept

### For Each Code File You Study

1. **Read First**: Understand the overall purpose
2. **Identify Patterns**: Look for Rust idioms
3. **Compare**: How would this be done in JavaScript/TypeScript?
4. **Experiment**: Clone and modify the code locally
5. **Document**: Write notes on confusing parts

### External Resources

- **The Rust Book**: For fundamentals (https://doc.rust-lang.org/book/)
- **Rust by Example**: For practical patterns (https://doc.rust-lang.org/rust-by-example/)
- **API Docs**: Use `cargo doc --open` to generate docs for this project
- **Crate Docs**: Check docs.rs for dependencies (serde, clap, tokio, etc.)

### Suggested Workflow

```bash
# Setup your learning environment
cd rust/

# Build and explore
cargo build                    # Compile everything
cargo doc --open              # Generate and view docs
cargo clippy                  # Check for common mistakes
cargo test                    # Run tests

# Try modifying code
# 1. Make a small change to leanspec-core
# 2. Run tests to see if it breaks
# 3. Fix any errors
# 4. Learn from compiler messages!

# Use the CLI to understand behavior
cargo run --bin leanspec-cli -- --help
cargo run --bin leanspec-cli -- list
```

## Key Rust Concepts Used in LeanSpec

### Ownership & Borrowing
- **Where**: Everywhere! Functions take `&SpecInfo` vs `SpecInfo`
- **Why**: Memory safety without garbage collection
- **Learn**: Pay attention to function signatures

### Pattern Matching
- **Where**: Handling `Result`, `Option`, enums
- **Why**: Exhaustive, safe control flow
- **Learn**: Look for `match` expressions

### Traits
- **Where**: `impl` blocks, trait bounds
- **Why**: Polymorphism and code reuse
- **Learn**: Common traits (Debug, Clone, Serialize)

### Lifetimes
- **Where**: Functions that return references
- **Why**: Ensuring references are valid
- **Learn**: Usually inferred, explicit when needed

### Zero-Cost Abstractions
- **Where**: Iterators, generics
- **Why**: High-level code, low-level performance
- **Learn**: Iterator chains compile to efficient loops

## Exercises

### Beginner
- [ ] Add a new field to `SpecInfo` struct
- [ ] Create a new `Priority` variant
- [ ] Write a function to filter specs by tag
- [ ] Add a new CLI command (like `lean-spec hello`)

### Intermediate
- [ ] Implement a new validator (e.g., check spec title length)
- [ ] Add a new search filter option
- [ ] Create a utility function for spec manipulation
- [ ] Parse a new frontmatter field format

### Advanced
- [ ] Add a new MCP tool
- [ ] Implement spec dependency cycle detection
- [ ] Optimize search performance with indexing
- [ ] Add parallel processing for large spec sets

## Rust vs TypeScript: Key Differences

| Concept | TypeScript | Rust |
|---------|-----------|------|
| **Memory** | Garbage collected | Ownership system |
| **Null** | `null`/`undefined` | `Option<T>` |
| **Errors** | Exceptions | `Result<T, E>` |
| **Types** | Gradual typing | Strong static typing |
| **Concurrency** | Event loop | Threads + async |
| **Compile time** | Type checking | Type + borrow checking |
| **Performance** | Runtime overhead | Zero-cost abstractions |

## Compiler as Teacher

The Rust compiler is famously helpful! When you get an error:
1. **Read the full message** - It explains what's wrong
2. **Check suggestions** - Often includes fixes
3. **Look up error code** - `rustc --explain E0308`
4. **Iterate** - Fix one error at a time

## Expected Outcomes

After completing this learning path, you should be able to:

- ✅ Read and understand the LeanSpec Rust codebase
- ✅ Modify existing functionality
- ✅ Add new features to CLI, MCP, or core
- ✅ Write tests for Rust code
- ✅ Understand Rust's ownership and borrowing
- ✅ Use common Rust patterns and idioms
- ✅ Debug Rust programs effectively
- ✅ Compare Rust vs TypeScript trade-offs

## Success Metrics

- Can explain ownership in 3 sentences or less
- Can add a new CLI command without copying code blindly
- Can fix a bug in the core library
- Can explain why Rust is faster than Node.js
- Feel comfortable reading Rust documentation

## Next Steps

After mastering this codebase:
1. Contribute improvements to LeanSpec
2. Build your own Rust CLI tool
3. Explore async Rust more deeply
4. Study systems programming concepts
5. Join the Rust community

## References

- LeanSpec Rust README: [rust/README.md](rust/README.md)
- Spec #170: [170-cli-mcp-core-rust-migration-evaluation](../170-cli-mcp-core-rust-migration-evaluation/README.md)
- Spec #172: [172-rust-cli-mcp-npm-distribution](../172-rust-cli-mcp-npm-distribution/README.md)
- Spec #181: [181-typescript-deprecation-rust-migration](../181-typescript-deprecation-rust-migration/README.md)

---

**Remember**: The best way to learn Rust is to write Rust. Start small, experiment often, and trust the compiler to guide you!