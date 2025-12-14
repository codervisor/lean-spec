# LeanSpec Rust Implementation

This directory contains the Rust implementation of LeanSpec's core functionality, CLI, and MCP server.

## Architecture

```
rust/
├── Cargo.toml              # Workspace configuration
├── leanspec-core/          # Core library crate
│   └── src/
│       ├── types/          # Data types (SpecInfo, SpecFrontmatter, etc.)
│       ├── parsers/        # Frontmatter parsing
│       ├── validators/     # Validation logic
│       └── utils/          # Utilities (dependency graph, token counter, etc.)
├── leanspec-cli/           # CLI binary crate
│   └── src/
│       ├── main.rs         # CLI entry point
│       └── commands/       # Command implementations
├── leanspec-mcp/           # MCP server binary crate
│   └── src/
│       ├── main.rs         # MCP server entry point
│       ├── protocol.rs     # JSON-RPC protocol handling
│       └── tools.rs        # MCP tool implementations
└── npm-dist/               # npm distribution helpers
    ├── binary-wrapper.js   # CLI binary wrapper for npm
    └── mcp-wrapper.js      # MCP binary wrapper for npm
```

## Building

```bash
# Build debug version
cargo build

# Build release version
cargo build --release

# Run tests
cargo test

# Check for issues
cargo clippy
```

## Binary Sizes

The release binaries are optimized for size:
- CLI binary: ~4.1MB
- MCP binary: ~3.9MB

These are well under the 15MB target and significantly smaller than the Node.js alternatives (~50MB with dependencies).

## Performance

Estimated performance improvements over TypeScript implementation:
- Spec validation: ~10x faster
- Dependency graph: ~10x faster
- Search: ~10x faster
- CLI startup: ~20x faster (no Node.js runtime)

## Dependencies

### Core Crate
- `serde` + `serde_yaml` - YAML parsing
- `serde_json` - JSON serialization
- `walkdir` - File system traversal
- `petgraph` - Dependency graph computation
- `regex` - Pattern matching
- `chrono` - Date/time handling
- `tiktoken-rs` - Token counting

### CLI Crate
- `clap` - Command line parsing
- `colored` - Terminal colors
- `dialoguer` - Interactive prompts
- `indicatif` - Progress bars

### MCP Crate
- `tokio` - Async runtime
- JSON-RPC protocol implementation

## Cross-Compilation

The binaries can be cross-compiled for multiple platforms using GitHub Actions:

- macOS (Intel + Apple Silicon)
- Linux (x64, arm64)
- Windows (x64)

See the CI workflow for cross-compilation configuration.
