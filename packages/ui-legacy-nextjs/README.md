# @leanspec/ui

LeanSpec's standalone web UI packaged for external projects. This package bundles the Next.js application built from `packages/web` and exposes a binary that starts the UI directly from your spec repository.

## Quick start

```bash
npx @leanspec/ui
```

The command will:
- auto-detect your specs directory (defaults to `./specs` or the value in `.lean-spec/config.json`)
- launch the LeanSpec UI in filesystem mode
- open `http://localhost:3000` in your default browser

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

## Troubleshooting

- **"Specs directory not found"** – Run `lean-spec init` in your project or pass `--specs /path/to/specs` explicitly. The launcher checks `.lean-spec/config.json`, `leanspec.yaml`, and common folders such as `./specs` or `./docs/specs`.
- **"LeanSpec UI build not found"** – Reinstall the package or run `pnpm --filter @leanspec/ui build` inside the monorepo to regenerate `dist/` before publishing.
- **Port already in use** – Pass `--port 3100` (or any free port between 1-65535).

## Developing inside the monorepo

1. Build the web package: `pnpm --filter @leanspec/web build`
2. Build the UI bundle: `pnpm --filter @leanspec/ui build`
3. Run the CLI locally: `node packages/ui/bin/ui.js --dry-run`

The build script copies the `.next/standalone`, `.next/static`, and `public/` artifacts from `packages/web` into `packages/ui/dist/` for publishing.

## License

MIT © Marvin Zhang
