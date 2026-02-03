# @leanspec/http-server

High-performance Rust HTTP server for LeanSpec UI.

## Features

- **Fast**: Built with Rust and Axum web framework
- **Lightweight**: <30MB bundle size
- **Multi-project**: Support for multiple project workspaces
- **RESTful API**: JSON API for all spec operations
- **Unified UI + API**: Serves the Vite UI and `/api/*` from one server
- **CORS-enabled**: Configurable cross-origin resource sharing
- **Detailed Logging**: Request tracing with error context for development

## Installation

```bash
npm install @leanspec/http-server
```

## Usage

### As a standalone server

```bash
npx leanspec-http
```

Options:
- `--host <host>` - Server host (default: 127.0.0.1)
- `--port <port>` - Server port (default: 3000)
- `-v, --verbose` - Enable verbose (debug) logging
- `--log-level <level>` - Log level: trace, debug, info, warn, error (default: info)
- `--help` - Show help message

### Development Mode

For improved developer experience, set environment variables to enable detailed logging:

```bash
# Enable debug mode with verbose logging
LEANSPEC_DEBUG=1 LEANSPEC_DEV_MODE=1 npx leanspec-http -v

# Or use RUST_LOG for fine-grained control
RUST_LOG=leanspec_http=debug,tower_http=debug npx leanspec-http
```

In dev mode, the server provides:
- **Request tracing**: Each request gets a unique ID for correlation
- **Error context**: Full error details with status codes and stack context
- **Latency tracking**: Response timing in milliseconds
- **File/line info**: Source location for debugging

### Log Levels

| Level   | When to use | What you see                        |
| ------- | ----------- | ----------------------------------- |
| `error` | Production  | Only errors/failures                |
| `warn`  | Production  | Warnings + errors                   |
| `info`  | Default     | Requests + responses + errors       |
| `debug` | Development | Detailed request/response info      |
| `trace` | Debugging   | Everything including internal calls |

### As a library

```javascript
import { spawn } from 'child_process';

const server = spawn('leanspec-http', ['--port', '3000']);
```

## Configuration

The server reads configuration from `~/.lean-spec/config.json`:

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 3000,
    "cors": {
      "enabled": false,
      "origins": [
        "http://localhost:5173",
        "http://localhost:3000"
      ]
    }
  }
}
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Add new project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Remove project
- `POST /api/projects/:id/switch` - Switch to project

### Specs
- `GET /api/specs` - List specs (with filters)
- `GET /api/specs/:spec` - Get spec detail
- `PATCH /api/specs/:spec/metadata` - Update spec metadata
- `POST /api/search` - Search specs
- `GET /api/stats` - Project statistics
- `GET /api/deps/:spec` - Dependency graph
- `GET /api/validate` - Validate all specs

### Health
- `GET /health` - Health check

## Platform Support

- macOS (x64, arm64)
- Linux (x64, arm64)
- Windows (x64)

## License

MIT
