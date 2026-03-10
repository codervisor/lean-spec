# LeanSpec Docker

Run the LeanSpec UI in a Docker container — useful for CI/CD, team self-hosting, and cloud deployment.

## Quick Start

### Using Docker Compose (recommended)

1. Edit `docker-compose.yml` and set the volume path to your project directory:
   ```yaml
   volumes:
     - /path/to/your/project:/specs
   ```

2. Start the container:
   ```sh
   docker compose up
   ```

3. Open http://localhost:3000 in your browser.

### Using Docker directly

```sh
docker pull ghcr.io/codervisor/leanspec:latest

docker run -p 3000:3000 \
  -v $(pwd):/specs \
  ghcr.io/codervisor/leanspec:latest \
  --project /specs
```

## Building Locally

```sh
docker build -t leanspec docker/
docker run -p 3000:3000 -v $(pwd):/specs leanspec --project /specs
```

## Configuration

| Option | Description |
|--------|-------------|
| `--project /specs` | Auto-register the mounted directory as a project on startup |
| `--host 0.0.0.0` | Bind all network interfaces (required for Docker port mapping — included by default) |
| `--no-open` | Skip browser launch (included by default in the image entrypoint) |
| `PORT` env var | Override the port (default: `3000`) |

### Custom port example

```sh
docker run -p 8080:8080 \
  -e PORT=8080 \
  -v $(pwd):/specs \
  ghcr.io/codervisor/leanspec:latest \
  --project /specs
```

## Image

The image is published to GitHub Container Registry:

```
ghcr.io/codervisor/leanspec:latest
ghcr.io/codervisor/leanspec:<version>   # e.g. 0.2.27
```

The image uses a two-stage build:
- **Builder stage** (`node:20-slim`): installs `@leanspec/http-linux-x64` and `@leanspec/ui` from npm
- **Runtime stage** (`debian:12-slim`): copies only the Rust binary and pre-built UI static files — no Node at runtime

No Rust compilation happens at build time.
