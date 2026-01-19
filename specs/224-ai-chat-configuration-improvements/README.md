---
status: planned
created: 2026-01-19
priority: high
tags:
- chat
- ai
- configuration
- security
- ai-sdk
depends_on:
- 094-ai-chatbot-web-integration
created_at: 2026-01-19T08:50:58.425335800Z
updated_at: 2026-01-19T08:51:03.311083028Z
---

# AI Chat Configuration Improvements

## Overview

The current AI chat implementation in `@leanspec/chat-server` has critical configuration and security limitations:

1. **Hardcoded credentials**: API keys are read from environment variables at server startup with no runtime management
2. **Limited provider support**: Only OpenAI/OpenRouter supported, despite AI SDK supporting 50+ providers
3. **No chat session management**: Each request is stateless; conversation context not properly managed (partially addressed in spec 223)

**Why now?**
- Security risk: API keys exposed in process environment
- Deployment friction: Requires server restart to change models or credentials
- User limitation: Can't switch providers or use their own API keys
- Developer experience: Adding new providers requires code changes

**Impact:**
- **Users**: Enable BYOK (bring your own key) for better privacy and cost control
- **Operators**: Hot-reload configuration without server restarts
- **Developers**: Extensible provider system via AI SDK's unified interface

## Design

### 1. Configuration-Driven Model Management

**Config Schema** (`~/.leanspec/chat-config.json`):
```json
{
  "version": "1.0",
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "apiKey": "${OPENAI_API_KEY}",
      "models": [
        {
          "id": "gpt-4o",
          "name": "GPT-4o",
          "default": true,
          "maxTokens": 128000
        },
        {
          "id": "gpt-4o-mini",
          "name": "GPT-4o Mini",
          "maxTokens": 128000
        }
      ]
    },
    {
      "id": "anthropic",
      "name": "Anthropic",
      "apiKey": "${ANTHROPIC_API_KEY}",
      "models": [
        {
          "id": "claude-sonnet-4-5",
          "name": "Claude Sonnet 4.5",
          "maxTokens": 200000
        }
      ]
    },
    {
      "id": "deepseek",
      "name": "Deepseek",
      "baseURL": "https://api.deepseek.com/v1",
      "apiKey": "${DEEPSEEK_API_KEY}",
      "models": [
        {
          "id": "deepseek-reasoner",
          "name": "Deepseek R1",
          "maxTokens": 64000
        }
      ]
    },
    {
      "id": "openrouter",
      "name": "OpenRouter",
      "baseURL": "https://openrouter.ai/api/v1",
      "apiKey": "${OPENROUTER_API_KEY}",
      "models": [
        {
          "id": "google/gemini-2.0-flash-thinking-exp:free",
          "name": "Gemini 2.0 Flash (Free)",
          "maxTokens": 32000
        }
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

**Environment Variable Interpolation**:
- Support `${VAR_NAME}` syntax in config
- Fall back to `.env` files or process environment
- Log warning if API key missing but don't crash server

**Config Hot-Reload**:
```typescript
import chokidar from 'chokidar';

class ConfigManager {
  private config: ChatConfig;
  private watcher: chokidar.FSWatcher;

  constructor(configPath: string) {
    this.config = this.loadConfig(configPath);
    this.watcher = chokidar.watch(configPath);
    
    this.watcher.on('change', () => {
      console.log('[config] reloading chat-config.json');
      this.config = this.loadConfig(configPath);
    });
  }

  getProvider(id: string): Provider | undefined {
    return this.config.providers.find(p => p.id === id);
  }

  getModel(providerId: string, modelId: string): Model | undefined {
    const provider = this.getProvider(providerId);
    return provider?.models.find(m => m.id === modelId);
  }
}
```

### 2. AI SDK Multi-Provider Support

**Provider Factory** (leverage AI SDK's native support):
```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

class ProviderFactory {
  static create(provider: Provider): any {
    const apiKey = this.resolveApiKey(provider.apiKey);
    
    switch (provider.id) {
      case 'openai':
        return createOpenAI({ apiKey, baseURL: provider.baseURL });
      
      case 'anthropic':
        return createAnthropic({ apiKey, baseURL: provider.baseURL });
      
      case 'google':
        return createGoogleGenerativeAI({ apiKey });
      
      // OpenRouter, Deepseek use OpenAI-compatible API
      case 'openrouter':
      case 'deepseek':
        return createOpenAI({ 
          apiKey, 
          baseURL: provider.baseURL ?? 'https://openrouter.ai/api/v1'
        });
      
      default:
        // Generic OpenAI-compatible provider
        return createOpenAI({ apiKey, baseURL: provider.baseURL });
    }
  }

  private static resolveApiKey(template: string): string {
    const match = template.match(/\$\{([^}]+)\}/);
    if (match) {
      return process.env[match[1]] ?? '';
    }
    return template;
  }
}
```

**Updated Chat Endpoint**:
```typescript
app.post('/api/chat', async (req, res) => {
  const { messages, projectId, providerId, modelId } = req.body;

  const configManager = ConfigManager.getInstance();
  const provider = configManager.getProvider(providerId ?? 'openai');
  const model = configManager.getModel(provider.id, modelId ?? 'gpt-4o');

  if (!provider || !model) {
    return res.status(400).json({ error: 'Invalid provider or model' });
  }

  const aiProvider = ProviderFactory.create(provider);
  const tools = createLeanSpecTools({ baseUrl, projectId });

  const result = streamText({
    model: aiProvider(model.id),
    tools,
    system: systemPrompt,
    messages,
    stopWhen: stepCountIs(configManager.config.settings.maxSteps),
  });

  result.pipeTextStreamToResponse(res);
});
```

### 3. Chat Session Management

**Note**: This section complements spec 223 (chat-persistence-strategy) by defining the **session lifecycle and backend API**, while spec 223 focuses on **SQLite-based storage and UI**.

**Session Schema** (aligns with spec 223's Conversation model):
```typescript
interface ChatSession {
  id: string;              // Maps to conversation_id in SQLite
  projectId: string;
  title: string;
  providerId: string;      // New: track which provider was used
  modelId: string;         // New: track which model was used
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

interface ChatMessage {
  id: string;
  sessionId: string;       // Maps to conversation_id in SQLite
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;        // Actual model used (may differ from requested)
    tokens?: { input: number; output: number };
    toolCalls?: any[];
  };
}
```

**Backend Session APIs** (new endpoints):
```typescript
// Create new session
app.post('/api/chat/sessions', async (req, res) => {
  const { projectId, providerId, modelId } = req.body;
  const session: ChatSession = {
    id: generateUUID(),
    projectId,
    providerId: providerId ?? 'openai',
    modelId: modelId ?? 'gpt-4o',
    title: 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  };
  // Store in SQLite (see spec 223 for schema)
  await saveSession(session);
  res.json(session);
});

// Get session history
app.get('/api/chat/sessions/:id', async (req, res) => {
  const session = await loadSession(req.params.id);
  const messages = await loadMessages(req.params.id);
  res.json({ session, messages });
});

// Update session (title, model)
app.patch('/api/chat/sessions/:id', async (req, res) => {
  const updates = req.body;
  const session = await updateSession(req.params.id, updates);
  res.json(session);
});

// Delete session
app.delete('/api/chat/sessions/:id', async (req, res) => {
  await deleteSession(req.params.id);
  res.json({ success: true });
});
```

**Updated Chat Endpoint with Session Context**:
```typescript
app.post('/api/chat', async (req, res) => {
  const { messages, projectId, sessionId, providerId, modelId } = req.body;

  // Load session config if provided
  let session: ChatSession | undefined;
  if (sessionId) {
    session = await loadSession(sessionId);
    if (session) {
      // Use session's model config
      providerId = session.providerId;
      modelId = session.modelId;
    }
  }

  // ... rest of streaming logic
  
  // After streaming completes, update session
  if (session) {
    session.messageCount = messages.length;
    session.updatedAt = Date.now();
    await updateSession(session.id, session);
  }
});
```

### 4. UI Configuration Interface

**Model Picker Component** (✅ Implemented):
```tsx
// packages/ui/src/components/chat/ModelPicker.tsx
import { useState, useEffect } from 'react';

interface ModelPickerProps {
  value?: { providerId: string; modelId: string };
  onChange: (value: { providerId: string; modelId: string }) => void;
  disabled?: boolean;
}

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const [config, setConfig] = useState<ChatConfig | null>(null);

  useEffect(() => {
    fetch('/api/chat/config')
      .then(res => res.json())
      .then(setConfig);
  }, []);

  if (!config) return <div>Loading...</div>;

  const currentProvider = config.providers.find(p => p.id === value?.providerId);

  return (
    <div className="flex gap-2">
      <Select
        value={value?.providerId ?? config.settings.defaultProviderId}
        onValueChange={(providerId) => {
          const provider = config.providers.find(p => p.id === providerId);
          const defaultModel = provider?.models[0];
          onChange({ providerId, modelId: defaultModel?.id ?? '' });
        }}
      >
        {config.providers.map(p => (
          <SelectItem key={p.id} value={p.id} disabled={!p.hasApiKey}>
            {p.name}
          </SelectItem>
        ))}
      </Select>

      <Select
        value={value?.modelId ?? config.settings.defaultModelId}
        onValueChange={(modelId) => {
          onChange({ providerId: currentProvider?.id ?? '', modelId });
        }}
      >
        {currentProvider?.models.map(m => (
          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
        ))}
      </Select>
    </div>
  );
}
```

**Settings Page** (✅ Implemented):
```tsx
// packages/ui/src/pages/ChatSettingsPage.tsx
export function ChatSettingsPage() {
  const [config, setConfig] = useState<ChatConfig | null>(null);

  // Load config from API
  useEffect(() => {
    fetch('/api/chat/config')
      .then(res => res.json())
      .then(setConfig);
  }, []);

  // Save config to API
  const saveConfig = async (newConfig: ChatConfig) => {
    await fetch('/api/chat/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    setConfig(newConfig);
  };

  return (
    <div>
      <h2>AI Provider Settings</h2>
      
      {/* Providers List with CRUD operations */}
      <Card>
        <CardHeader>
          <CardTitle>AI Providers</CardTitle>
          <Button onClick={openAddProviderDialog}>+ Add Provider</Button>
        </CardHeader>
        <CardContent>
          {config?.providers.map(provider => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onEdit={() => editProvider(provider)}
              onDelete={() => deleteProvider(provider.id)}
              onAddModel={() => addModelToProvider(provider.id)}
              onEditModel={(model) => editModel(provider.id, model)}
              onDeleteModel={(modelId) => deleteModel(provider.id, modelId)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Default Provider</Label>
            <Select
              value={config?.settings.defaultProviderId}
              onValueChange={(id) => updateDefaults('defaultProviderId', id)}
            >
              {config?.providers.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </Select>
          </div>
          
          <div>
            <Label>Default Model</Label>
            <Select
              value={config?.settings.defaultModelId}
              onValueChange={(id) => updateDefaults('defaultModelId', id)}
            >
              {currentProvider?.models.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </Select>
          </div>
          
          <div>
            <Label>Max Steps</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={config?.settings.maxSteps}
              onChange={(e) => updateDefaults('maxSteps', Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Provider Add/Edit Dialog */}
      <ProviderDialog
        provider={editingProvider}
        onSave={handleSaveProvider}
        onCancel={() => setEditingProvider(null)}
      />

      {/* Model Add/Edit Dialog */}
      <ModelDialog
        model={editingModel}
        onSave={handleSaveModel}
        onCancel={() => setEditingModel(null)}
      />
    </div>
  );
}
```

**Features Implemented**:
- ✅ View all configured providers with API key status indicators
- ✅ Add new providers with validation (ID format, URL validation, required fields)
- ✅ Edit provider details (name, base URL, API key using ${ENV_VAR} syntax)
- ✅ Delete providers with confirmation
- ✅ Add/edit/delete models for each provider
- ✅ Configure default provider, model, and max steps
- ✅ Real-time config updates via PUT /api/chat/config
- ✅ Form validation and error messages
- ✅ i18n support (English and Chinese)
- ✅ Integration with ChatPage via Settings icon (Sliders icon)
```

### 5. Security Considerations

**API Key Storage**:
- **Local development**: Use `.env` files (never commit)
- **Production deployment**: Use environment variables or secrets management
- **Desktop app**: Store in secure OS keychain (via Tauri's `tauri-plugin-stronghold`)
- **Web UI**: API keys never sent to browser; server-side only

**Config Validation**:
```typescript
import { z } from 'zod';

const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseURL: z.string().url().optional(),
  apiKey: z.string(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
    maxTokens: z.number().optional(),
    default: z.boolean().optional(),
  })),
});

const ChatConfigSchema = z.object({
  version: z.string(),
  providers: z.array(ProviderSchema),
  settings: z.object({
    maxSteps: z.number().min(1).max(50),
    defaultProviderId: z.string(),
    defaultModelId: z.string(),
  }),
});

function validateConfig(config: unknown): ChatConfig {
  return ChatConfigSchema.parse(config);
}
```

## Plan

### Phase 1: Configuration Infrastructure (2 days)
- [x] Define `ChatConfig` TypeScript interfaces
- [x] Create `ConfigManager` class with hot-reload support
- [x] Add Zod schema validation
- [x] Implement environment variable interpolation (`${VAR_NAME}`)
- [x] Create default config with OpenAI/Anthropic/Deepseek
- [x] Add `/api/chat/config` endpoint (read-only)
- [ ] Test: Config loads, hot-reloads, validates correctly

### Phase 2: Multi-Provider Support (2 days)
- [ ] Install AI SDK provider packages: `@ai-sdk/anthropic`, `@ai-sdk/google`
- [ ] Create `ProviderFactory` class
- [x] Update `/api/chat` endpoint to use dynamic providers
- [x] Support provider/model selection in request body
- [ ] Test: Switch between OpenAI, Anthropic, Deepseek mid-conversation
- [ ] Document supported providers in README

### Phase 3: Session Management Backend (2 days)
- [ ] Define `ChatSession` and `ChatMessage` schemas (align with spec 223)
- [ ] Add `provider_id` and `model_id` columns to SQLite conversations table
- [ ] Create session CRUD endpoints: POST/GET/PATCH/DELETE `/api/chat/sessions`
- [ ] Update `/api/chat` to accept `sessionId` and persist messages to SQLite
- [ ] Add session context (provider/model) to streaming responses
- [ ] Test: Create session, send messages, reload conversation

### Phase 4: UI Integration (2 days)
- [x] Create `ModelPicker` component with provider/model dropdowns
- [x] Add model picker to chat input area
- [x] Create `ChatSettingsPage` with provider management
- [x] Add "Add Provider" modal with form validation
- [x] Add "Add Model" modal with form validation
- [x] Persist selected model in session state
- [x] Add routing for /chat/settings
- [x] Add navigation button in ChatPage header
- [x] Test: Change models, add custom provider, save settings

### Phase 5: Security & Desktop Integration (1 day)
- [ ] Add API key validation before allowing provider selection
- [ ] Implement secure keychain storage for desktop app (Tauri)
- [ ] Add config file encryption option (optional)
- [ ] Document security best practices
- [ ] Test: API keys never exposed in browser, keychain integration works

### Phase 6: Documentation (1 day)
- [ ] Update chat-server README with configuration examples
- [ ] Document all supported providers with setup instructions
- [ ] Add troubleshooting guide for common provider issues
- [ ] Create example configs for popular providers
- [ ] Test: Fresh install creates default config with working examples

## Test

### Manual Testing
- [ ] **Config Management**
  - [ ] Edit `chat-config.json`, verify hot-reload without server restart
  - [ ] Add invalid config, verify validation error
  - [ ] Use `${OPENAI_API_KEY}` variable, verify interpolation
  - [ ] Remove API key, verify graceful degradation

- [ ] **Multi-Provider**
  - [ ] Start chat with GPT-4o, switch to Claude mid-conversation
  - [ ] Add Deepseek provider via UI, verify it appears in picker
  - [ ] Test OpenRouter with free Gemini model
  - [ ] Verify tool calling works across all providers

- [ ] **Session Management**
  - [ ] Create new session, send messages, reload page, verify history persists
  - [ ] Switch between sessions, verify correct context loaded
  - [ ] Delete session, verify messages removed
  - [ ] Update session title, verify it saves

- [ ] **Security**
  - [ ] Verify API keys never appear in browser DevTools
  - [ ] Test desktop app keychain integration
  - [ ] Attempt to access `/api/chat/config`, verify API keys redacted

### Automated Tests
```typescript
describe('ConfigManager', () => {
  it('loads config with environment variable interpolation', () => {
    process.env.TEST_API_KEY = 'sk-test-123';
    const config = new ConfigManager('test-config.json');
    expect(config.getProvider('openai')?.apiKey).toBe('sk-test-123');
  });

  it('hot-reloads config on file change', async () => {
    const manager = new ConfigManager('test-config.json');
    fs.writeFileSync('test-config.json', JSON.stringify({ providers: [] }));
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(manager.config.providers).toEqual([]);
  });
});

describe('ProviderFactory', () => {
  it('creates OpenAI provider', () => {
    const provider = ProviderFactory.create({ id: 'openai', apiKey: 'test' });
    expect(provider).toBeDefined();
  });

  it('creates Anthropic provider', () => {
    const provider = ProviderFactory.create({ id: 'anthropic', apiKey: 'test' });
    expect(provider).toBeDefined();
  });
});

describe('Session API', () => {
  it('creates new session with default model', async () => {
    const res = await request(app)
      .post('/api/chat/sessions')
      .send({ projectId: 'test-project' });
    expect(res.body.providerId).toBe('openai');
    expect(res.body.modelId).toBe('gpt-4o');
  });

  it('loads session history from SQLite', async () => {
    const session = await createSession();
    const res = await request(app).get(`/api/chat/sessions/${session.id}`);
    expect(res.body.messages).toBeInstanceOf(Array);
    // Verify data comes from SQLite
    expect(res.body.session.providerId).toBeDefined();
  });
});
```

### Success Criteria
- ✅ Users can add/remove AI providers without code changes
- ✅ API keys hot-reload without server restart
- ✅ Chat sessions persist across page reloads
- ✅ Model switching works mid-conversation
- ✅ API keys never exposed in browser
- ✅ Desktop app uses secure keychain storage
- ✅ Config validation prevents invalid configurations

## Notes

### Implementation Summary (Phase 4 Complete)

**What Was Implemented:**

1. **Configuration Management Backend** (`packages/chat-server/src/config.ts`)
   - `ConfigManager` class for loading/saving chat configuration
   - Zod schemas for validation
   - Environment variable interpolation (`${OPENAI_API_KEY}`)
   - Default config with 4 providers (OpenAI, Anthropic, Deepseek, OpenRouter)
   - API key redaction when sending config to client

2. **API Endpoints** (`packages/chat-server/src/index.ts`)
   - `GET /api/chat/config` - Returns config without exposing API keys
   - `PUT /api/chat/config` - Updates configuration with validation
   - Updated `POST /api/chat` to accept `providerId` and `modelId`

3. **UI Components**
   - **ModelPicker** (`packages/ui/src/components/chat/ModelPicker.tsx`)
     - Quick provider/model selection in chat header
     - Shows "(no key)" for providers without configured API keys
     - Integrated into ChatPage settings panel
   
   - **ChatSettingsPage** (`packages/ui/src/pages/ChatSettingsPage.tsx`)
     - Full CRUD interface for providers and models
     - Add/edit/delete providers with validation
     - Add/edit/delete models for each provider
     - Configure default provider, model, and max steps
     - Form validation with error messages
     - Confirmation dialogs for destructive actions
     - Real-time updates via API

4. **Routing & Navigation**
   - Route: `/projects/:projectId/chat/settings`
   - Navigation: Sliders icon in ChatPage header
   - Separate icons for quick model picker (Settings2) and full settings (Sliders)

5. **i18n Support**
   - English translations for all UI elements
   - Chinese (zh-CN) translations for all UI elements
   - Comprehensive error messages and help text

**Usage Flow:**

1. User opens chat page (`/chat`)
2. Clicks Settings2 icon → shows inline ModelPicker
3. Clicks Sliders icon → navigates to full settings page
4. On settings page:
   - View all providers with their models
   - Add custom providers (e.g., local LLM endpoints)
   - Edit API keys using `${ENV_VAR}` syntax
   - Configure default provider/model for new sessions
   - Adjust max steps for tool execution

**Configuration File:**
Location: `~/.leanspec/chat-config.json`

Example:
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
    }
  ],
  "settings": {
    "maxSteps": 10,
    "defaultProviderId": "openai",
    "defaultModelId": "gpt-4o"
  }
}
```

### Architecture Decisions

**Why JSON config over database?**
- **Simplicity**: Easy to edit manually, version control friendly
- **Portability**: Copy config across machines
- **No migration**: No schema changes, just add new fields
- **Performance**: In-memory config fast enough for chat use case

**Why SQLite for session storage?**
- **Unified storage**: Same database used for all chat persistence (spec 223)
- **ACID compliance**: Reliable transactions, no partial writes
- **Performance**: Fast queries with proper indexes
- **Local-first**: Works offline, single file at `~/.leanspec/chat.db`
- **Easy backup**: Just copy the database file

**Session management integration with spec 223**:
- **This spec (224)**: Defines provider/model tracking in sessions, backend APIs
- **Spec 223**: Implements SQLite storage layer, conversation UI, schema
- **Integration**: Extend spec 223's conversations table with `provider_id` and `model_id` columns
- **Storage location**: `~/.leanspec/chat.db` (single SQLite database for all chat data)

### AI SDK Provider Support

AI SDK natively supports:
- **OpenAI**: GPT-4o, GPT-4o-mini, o1, o3-mini
- **Anthropic**: Claude Sonnet/Opus/Haiku
- **Google**: Gemini Pro/Flash
- **Mistral**: Mistral Large/Small
- **Groq**: LLaMA models with ultra-fast inference
- **Cohere**: Command models
- **OpenRouter**: 50+ models via unified API
- **Deepseek**: R1 reasoning model

Any OpenAI-compatible API works with `createOpenAI()` + custom `baseURL`.

### Related Specs

- **Spec 094**: AI Chatbot Web Integration - Original chat implementation
- **Spec 223**: Chat Persistence Strategy - Client-side storage and UI
- **Spec 221**: AI Orchestration Integration - Future multi-agent workflows

### Future Enhancements

- **Model usage analytics**: Track token consumption per model
- **Cost estimation**: Show estimated cost before sending message
- **Rate limiting**: Prevent API abuse
- **Model comparison**: Side-by-side responses from multiple models
- **Custom system prompts**: Per-provider or per-session overrides
- **Streaming optimization**: Reduce latency with connection pooling