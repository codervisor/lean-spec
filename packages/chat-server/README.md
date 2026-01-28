# ⚠️ DEPRECATED

This package is **deprecated** and will be removed in a future version. 

Please use `@leanspec/ai-worker` instead, which provides IPC-based AI chat functionality.

---

# @leanspec/chat-server

Standalone AI chat sidecar for LeanSpec UI.

## Usage

```bash
pnpm --filter @leanspec/chat-server dev
```

### Configuration

Chat server configuration is loaded from:

`~/.leanspec/chat-config.json`

The file is hot-reloaded on change (no server restart required).

Example config:

```json
{
	"version": "1.0",
	"providers": [
		{
			"id": "openai",
			"name": "OpenAI",
			"apiKey": "${OPENAI_API_KEY}",
			"models": [
				{ "id": "gpt-4o", "name": "GPT-4o", "maxTokens": 128000 }
			]
		},
		{
			"id": "anthropic",
			"name": "Anthropic",
			"apiKey": "${ANTHROPIC_API_KEY}",
			"models": [
				{ "id": "claude-sonnet-4-5", "name": "Claude Sonnet 4.5" }
			]
		},
		{
			"id": "openrouter",
			"name": "OpenRouter",
			"baseURL": "https://openrouter.ai/api/v1",
			"apiKey": "${OPENROUTER_API_KEY}",
			"models": [
				{ "id": "google/gemini-2.0-flash-thinking-exp:free", "name": "Gemini 2.0 Flash (Free)" }
			]
		}
	],
	"settings": {
		"maxSteps": 10,
		"defaultProviderId": "openai",
		"defaultModelId": "gpt-4o"
	}
}
```

### Environment

- `LEANSPEC_CHAT_SOCKET` (default: `/tmp/leanspec-chat.sock`)
- `LEANSPEC_CHAT_TRANSPORT` (`socket` | `http`)
- `LEANSPEC_CHAT_PORT` (HTTP mode)
- `LEANSPEC_CHAT_PORT_FILE` (HTTP mode)
- `LEANSPEC_CHAT_URL` (explicit HTTP URL for proxying)
- `LEANSPEC_HTTP_URL` (default: `http://127.0.0.1:3030`) - used for LeanSpec tools + session persistence
- Provider keys referenced in config, e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`

### Supported Providers

The server supports AI SDK providers via configuration:

- OpenAI (`openai`)
- Anthropic (`anthropic`)
- Google Generative AI (`google`)
- OpenRouter (`openrouter`)
- Deepseek (`deepseek`)
- Any OpenAI-compatible API (custom `baseURL`)

### Troubleshooting

- Missing API key errors: ensure `${VAR_NAME}` in config matches an environment variable.
- Provider disabled in UI: the provider has no resolved API key.
- Config validation errors: check JSON syntax and required fields (`id`, `name`, `apiKey`, `models`).
