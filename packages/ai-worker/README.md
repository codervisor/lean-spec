# @leanspec/ai-worker

IPC-based AI worker process for LeanSpec. This package is spawned by the Rust HTTP server and communicates over stdin/stdout using JSON Lines.

## Usage

```bash
pnpm --filter @leanspec/ai-worker build
```

The worker is started by the Rust HTTP server. You generally do not run it manually.
