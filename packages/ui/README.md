# @leanspec/ui

Standalone web UI for LeanSpec - A lightweight spec methodology for AI-powered development.

## What is this?

`@leanspec/ui` is a standalone package that provides a web-based user interface for browsing and managing your LeanSpec specifications. It launches a local web server that reads specs directly from your filesystem.

## Installation & Usage

You don't need to install this package globally. Just run it with `npx`:

```bash
# Auto-detect specs directory and start on port 3000
npx @leanspec/ui

# Specify custom specs directory
npx @leanspec/ui --specs ./my-specs

# Use custom port
npx @leanspec/ui --port 4000

# Don't open browser automatically
npx @leanspec/ui --no-open
```

## Requirements

- Node.js 20 or higher
- A directory containing LeanSpec specifications

## How It Works

The UI uses **filesystem mode** to read specs:

- Direct reads from your `specs/` directory (no database required)
- In-memory caching with 60-second TTL
- Changes to spec files appear within 60 seconds
- No manual seeding or sync required

## Options

```
Usage: npx @leanspec/ui [options]

Options:
  --specs <dir>        Specs directory (auto-detected if not specified)
  --port, -p <port>    Port to run on (default: 3000)
  --no-open            Don't open browser automatically
  --help, -h           Show this help message
```

## Auto-Detection

If you don't specify a `--specs` directory, the UI will automatically look for specs in:

1. `./specs`
2. `./spec`
3. `./docs/specs`
4. `./docs/spec`
5. `./.lean-spec/specs`
6. The `specsDir` field in `leanspec.yaml` config file

## Features

- 📊 Visual spec browser with status indicators
- 🔍 Search across all specs
- 📈 Project statistics and health metrics
- 🎯 Kanban board view
- 🔗 Relationship visualization
- 📱 Responsive design
- ⚡ Fast filesystem-based reads

## Environment Variables

The UI automatically sets these environment variables:

- `SPECS_MODE=filesystem` - Use direct filesystem reads
- `SPECS_DIR=/path/to/specs` - Absolute path to specs directory
- `PORT=3000` - Port number

You don't need to set these manually.

## Troubleshooting

### "Specs directory not found"

Make sure you have a `specs/` directory in your project, or use `--specs` to specify a custom location.

Initialize LeanSpec in your project:

```bash
npx lean-spec init
```

### Port already in use

Use a different port:

```bash
npx @leanspec/ui --port 4000
```

### Browser doesn't open automatically

Use the URL printed in the terminal to open your browser manually, or omit `--no-open` flag.

## Related Packages

- `lean-spec` - CLI for managing specs
- `@leanspec/core` - Core library for spec parsing and validation
- `@leanspec/web` - Web application (used internally by this package)

## Learn More

- [LeanSpec Documentation](https://lean-spec.dev)
- [GitHub Repository](https://github.com/codervisor/lean-spec)
- [LeanSpec CLI](https://www.npmjs.com/package/lean-spec)

## License

MIT © Marvin Zhang
