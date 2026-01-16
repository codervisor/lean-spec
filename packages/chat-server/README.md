# @leanspec/chat-server

Standalone AI chat sidecar for LeanSpec UI.

## Usage

```bash
pnpm --filter @leanspec/chat-server dev
```

### Environment

- `LEANSPEC_CHAT_SOCKET` (default: `/tmp/leanspec-chat.sock`)
- `LEANSPEC_CHAT_TRANSPORT` (`socket` | `http`)
- `LEANSPEC_CHAT_PORT` (HTTP mode)
- `LEANSPEC_CHAT_PORT_FILE` (HTTP mode)
- `LEANSPEC_HTTP_URL` (default: `http://127.0.0.1:3030`)
- `OPENAI_API_KEY`
- `DEFAULT_MODEL` (default: `gpt-4o`)
- `MAX_STEPS` (default: `10`)
