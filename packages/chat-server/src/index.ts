import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { streamText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createLeanSpecTools } from './tools';
import { systemPrompt } from './prompts';

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

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, projectId, model } = req.body ?? {};

    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'messages must be an array' });
      return;
    }

    const baseUrl = process.env.LEANSPEC_HTTP_URL ?? 'http://127.0.0.1:3030';
    const tools = createLeanSpecTools({ baseUrl, projectId });

    const maxSteps = Number.parseInt(process.env.MAX_STEPS ?? '10', 10);
    const modelName = model ?? process.env.DEFAULT_MODEL ?? 'gpt-4o';

    const result = streamText({
      model: openai(modelName) as any,
      tools,
      system: systemPrompt,
      messages,
      stopWhen: stepCountIs(Number.isFinite(maxSteps) ? maxSteps : 10),
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
