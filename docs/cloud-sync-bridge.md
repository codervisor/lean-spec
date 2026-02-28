# Cloud Sync Bridge Setup

> **⚠️ DEPRECATED**: The Sync Bridge package (`leanspec-sync-bridge`) has been deprecated and is no longer actively maintained. It has been excluded from the Cargo workspace. This documentation is kept for historical reference only.

## Overview

The Sync Bridge connects a local LeanSpec workspace to the cloud UI. The local filesystem remains the source of truth. The bridge streams snapshots and deltas to the cloud and applies explicit metadata edits from the cloud to the local files.

## Setup

1. **Start the cloud API**

   Ensure the LeanSpec HTTP server is running and reachable over HTTPS:

   - Base URL: `https://your-cloud-host`
   - Sync endpoints: `/api/sync/*`

2. **Provision authentication**

   - **Device flow (default):** No API key required. The bridge will request a device code and prompt you to authorize.
   - **API key (optional):** Set `LEANSPEC_SYNC_API_KEY` on the server and pass `--api-key` to the bridge.

3. **Run the bridge**

   ```bash
   leanspec-sync-bridge \
     --server-url https://your-cloud-host \
     --project /path/to/project-a \
     --project /path/to/project-b
   ```

   The first run will prompt a device authorization code unless an API key is supplied.

## Security Model

### Device Flow Authentication

- The bridge requests a device code from `/api/sync/device/code`.
- The user completes authorization at the verification URL.
- The bridge exchanges the device code at `/api/sync/oauth/token` and stores the access token locally.

### TLS Requirement

All Sync Bridge traffic must use HTTPS in production. The bridge rejects plain HTTP by default; use `--allow-insecure` only for local development.

### API Key Rotation

When using API keys:

1. Generate a new key and set `LEANSPEC_SYNC_API_KEY` on the server.
2. Update bridges with `--api-key <new-key>` or update `~/.lean-spec/bridge.json`.
3. Restart bridge instances to pick up the new key.
4. Revoke old keys by removing them from server configuration.

## Operational Notes

- The bridge queues events locally when offline and flushes on reconnect.
- Metadata edits from the cloud include a content hash; the bridge rejects edits if the local file has changed.
- Audit logs are stored at `~/.lean-spec/bridge-audit.log`.
