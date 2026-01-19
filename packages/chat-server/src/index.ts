import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { streamText, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createLeanSpecTools } from './tools';
import { systemPrompt } from './prompts';
import { ConfigManager } from './config';

const app = express();
app.use(express.json({ limit: '2mb' }));

const DEFAULT_SOCKET = '/tmp/leanspec-chat.sock';
const DEFAULT_HTTP_HOST = '127.0.0.1';
const DEFAULT_HTTP_PORT_FILE = path.join(os.homedir(), '.leanspec', 'chat-port.txt');

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version ?? 'dev' });
});

// Get chat config (without exposing API keys)
app.get('/api/chat/config', (_req, res) => {
  try {
    const configManager = ConfigManager.getInstance();
    const config = configManager.getConfigForClient();
    res.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Update chat config
app.put('/api/chat/config', (req, res) => {
  try {
    const configManager = ConfigManager.getInstance();
    configManager.saveConfig(req.body);
    const config = configManager.getConfigForClient();
    res.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, projectId, providerId, modelId } = req.body ?? {};

    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'messages must be an array' });
      return;
    }

    const baseUrl = process.env.LEANSPEC_HTTP_URL ?? 'http://127.0.0.1:3030';
    const tools = createLeanSpecTools({ baseUrl, projectId });

    const configManager = ConfigManager.getInstance();
    const config = configManager.getConfig();

    // Use provided provider/model or fall back to defaults
    const selectedProviderId = providerId ?? config.settings.defaultProviderId;
    const selectedModelId = modelId ?? config.settings.defaultModelId;

    const provider = configManager.getProvider(selectedProviderId);
    if (!provider) {
      res.status(400).json({ error: `Invalid provider: ${selectedProviderId}` });
      return;
    }

    const model = configManager.getModel(selectedProviderId, selectedModelId);
    if (!model) {
      res.status(400).json({ error: `Invalid model: ${selectedModelId}` });
      return;
    }

    // Transform messages from UI format (with parts) to AI SDK format (with content)
    const transformedMessages = messages.map((msg: any) => {
      if (msg.parts && Array.isArray(msg.parts)) {
        // Extract text content from parts array
        const textContent = msg.parts
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('\n');
        
        return {
          role: msg.role,
          content: textContent,
        };
      }
      // If already in correct format, return as-is
      return msg;
    });

    // Create provider with resolved API key
    const apiKey = configManager.resolveProviderApiKey(selectedProviderId);
    if (!apiKey) {
      res.status(400).json({ 
        error: `API key not configured for provider: ${provider.name}. Please configure it in the settings.` 
      });
      return;
    }

    const openaiProvider = createOpenAI({
      apiKey,
      baseURL: provider.baseURL,
    });

    const result = streamText({
      model: openaiProvider(model.id) as any,
      tools,
      system: systemPrompt,
      messages: transformedMessages,
      stopWhen: stepCountIs(config.settings.maxSteps),
    });

    result.pipeTextStreamToResponse(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

function startHttpServer() {
  const port = Number.parseInt(process.env.LEANSPEC_CHAT_PORT ?? '0', 10);
  const server = app.listen(port, DEFAULT_HTTP_HOST, () => {
    const address = server.address();
    if (address && typeof address === 'object') {
      const portFile = process.env.LEANSPEC_CHAT_PORT_FILE ?? DEFAULT_HTTP_PORT_FILE;
      ensureDir(portFile);
      fs.writeFileSync(portFile, `${address.port}`, 'utf-8');
      console.log(`[leanspec-chat] listening on http://${DEFAULT_HTTP_HOST}:${address.port}`);
    }
  });
}

function startSocketServer() {
  const socketPath = process.env.LEANSPEC_CHAT_SOCKET ?? DEFAULT_SOCKET;
  if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
  }

  app.listen(socketPath, () => {
    console.log(`[leanspec-chat] listening on unix:${socketPath}`);
  });
}

const transport = (process.env.LEANSPEC_CHAT_TRANSPORT ?? '').toLowerCase();
if (transport === 'http') {
  startHttpServer();
} else {
  try {
    startSocketServer();
  } catch (error) {
    console.warn('[leanspec-chat] socket start failed, falling back to HTTP', error);
    startHttpServer();
  }
}
