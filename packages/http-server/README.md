# @leanspec/http-server

High-performance Rust HTTP server for LeanSpec UI.

## Features

- **Fast**: Built with Rust and Axum web framework
- **Lightweight**: <30MB bundle size
- **Multi-project**: Support for multiple project workspaces
- **RESTful API**: JSON API for all spec operations
- **CORS-enabled**: Configurable cross-origin resource sharing

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
- `--port <port>` - Server port (default: 3333)
- `--help` - Show help message

### As a library

```javascript
import { spawn } from 'child_process';

const server = spawn('leanspec-http', ['--port', '3333']);
```

## Configuration

The server reads configuration from `~/.lean-spec/config.json`:

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 3333,
    "cors": {
      "enabled": true,
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
