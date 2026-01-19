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
- `OPENAI_API_KEY` (required) or `OPENROUTER_API_KEY`
- `OPENAI_BASE_URL` (optional, for custom APIs)
- `DEFAULT_MODEL` (default: `gpt-4o`)
- `MAX_STEPS` (default: `10`)

#### Examples

**OpenAI:**
```bash
OPENAI_API_KEY=sk-...
DEFAULT_MODEL=gpt-4o
```

**OpenRouter (Option 1 - auto-configured):**
```bash
OPENROUTER_API_KEY=sk-or-v1-...
DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```

**OpenRouter (Option 2 - explicit):**
```bash
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```
