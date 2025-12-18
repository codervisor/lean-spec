# @leanspec/ui

LeanSpec's standalone web UI packaged for external projects. This package bundles the Next.js application built from `packages/web` and exposes a binary that starts the UI directly from your spec repository.

## Quick start

```bash
npx @leanspec/ui
```

The command will:
- auto-detect your specs directory (defaults to `./specs` or the value in `.lean-spec/config.json`)
- automatically find an available port (starting from 3000)
- launch the LeanSpec UI in filesystem mode
- open the UI in your default browser

## CLI options

```
Usage: leanspec-ui [options]

Options:
  -s, --specs <dir>    specs directory (auto-detected if omitted)
  -p, --port <port>    port to run on (default: 3000)
      --no-open        do not open the browser automatically
      --dry-run        show what would run without executing
  -h, --help           display help
```

Examples:

```bash
# Use a custom specs directory
npx @leanspec/ui --specs ./docs/specs

# Run on a different port without opening the browser
npx @leanspec/ui --port 3100 --no-open
```

## Environment

The launcher sets the following variables for the packaged Next.js server:

- `SPECS_MODE=filesystem`
- `SPECS_DIR=<absolute path to your specs>`
- `PORT=<port>`

## Port allocation

The UI automatically detects and resolves port conflicts:

- **Default behavior**: Starts on port 3000, or the next available port if 3000 is in use
- **Explicit port**: Use `--port 3100` to request a specific port (will still auto-resolve if unavailable)
- **Port search**: Tries up to 10 consecutive ports before failing

Example output when port 3000 is in use:
```
⚠ Port 3000 is in use, trying 3001...
✓ Using port 3001

✨ LeanSpec UI: http://localhost:3001
```

This eliminates common port conflicts with other development servers (React, Next.js, Vite, etc.) running on your system.

## Troubleshooting

- **"Specs directory not found"** – Run `lean-spec init` in your project or pass `--specs /path/to/specs` explicitly. The launcher checks `.lean-spec/config.json`, `leanspec.yaml`, and common folders such as `./specs` or `./docs/specs`.
- **"LeanSpec UI build not found"** – Reinstall the package or run `pnpm --filter @leanspec/ui build` inside the monorepo to regenerate `dist/` before publishing.
- **"Could not find an available port"** – All ports in the range 3000-3009 (or your requested range) are in use. Specify a different port with `--port <number>` or free up some ports.

## Developing inside the monorepo

1. Build the web package: `pnpm --filter @leanspec/web build`
2. Build the UI bundle: `pnpm --filter @leanspec/ui build`
3. Run the CLI locally: `node packages/ui/bin/ui.js --dry-run`

The build script copies the `.next/standalone`, `.next/static`, and `public/` artifacts from `packages/web` into `packages/ui/dist/` for publishing.

## License

MIT © Marvin Zhang
