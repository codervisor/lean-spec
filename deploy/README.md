# Cloud Deployment Guide

LeanSpec can be deployed to any cloud platform that supports Docker containers.

## Quick Start

### Docker (self-hosted)

```bash
docker run -d \
  -p 3000:3000 \
  -v leanspec-data:/home/leanspec/.lean-spec \
  -e LEANSPEC_API_KEY=your-secret-key \
  ghcr.io/codervisor/leanspec:latest
```

Or use the example docker-compose file:

```bash
cd deploy/examples && docker compose up -d
```

### Fly.io

```bash
cp deploy/fly.toml .
fly launch --copy-config
fly secrets set LEANSPEC_API_KEY=your-secret-key
fly deploy
```

### Railway

1. Connect your GitHub repo
2. Railway auto-detects `railway.json`
3. Set `LEANSPEC_API_KEY` in the Railway dashboard
4. Add a volume mounted at `/data` and set `LEANSPEC_DATA_DIR=/data`

### Render

1. Create a new Blueprint from `deploy/render.yaml`
2. Render auto-generates `LEANSPEC_API_KEY`
3. Persistent disk is configured automatically

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `LEANSPEC_HOST` | `127.0.0.1` | Bind address (use `0.0.0.0` in containers) |
| `LEANSPEC_DATA_DIR` | `~/.lean-spec` | Persistent data directory |
| `LEANSPEC_API_KEY` | _(none)_ | Bearer token for API authentication |
| `LEANSPEC_LOG_FORMAT` | `text` | `text` or `json` for structured logging |
| `LEANSPEC_LOG_LEVEL` | `info` | Log verbosity |
| `LEANSPEC_CORS_ORIGINS` | _(allow all)_ | Comma-separated allowed origins |
| `LEANSPEC_UI_DIST` | _(auto)_ | Path to UI static files |
| `LEANSPEC_PROJECT_SOURCES` | `local,github` | Enabled project sources (comma-separated: `local`, `github`) |

## Health Checks

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `GET /health` | Basic health + version | No |
| `GET /health/live` | Liveness probe | No |
| `GET /health/ready` | Readiness (checks DB) | No |

## Architecture

The Docker image runs a single Rust binary serving both the API and static UI files.
No Node.js runtime is required. The image is ~30MB compressed.

```
┌─────────────────────────────┐
│  Cloud Platform (Fly/Railway/Render)  │
│  ┌───────────────────────┐  │
│  │  leanspec-http binary │  │
│  │  ├── REST API         │  │
│  │  ├── Static UI files  │  │
│  │  └── SQLite DB        │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │  Persistent Volume    │  │
│  │  └── /data/           │  │
│  │      ├── leanspec.db  │  │
│  │      ├── config.json  │  │
│  │      └── projects.json│  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

## Platform Comparison

| Feature | Fly.io | Railway | Render |
|---------|--------|---------|--------|
| Free tier | Yes (limited) | Yes (limited) | Yes (limited) |
| Persistent volumes | Yes | Yes | Yes (disk) |
| Auto-sleep | Yes | Yes | No |
| Custom domains | Yes | Yes | Yes |
| Health checks | Yes | Yes | Yes |
| Auto-deploy from GitHub | Yes | Yes | Yes |
