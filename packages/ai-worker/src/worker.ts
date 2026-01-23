import 'dotenv/config';
import { createInterface } from 'readline';
import { streamText, stepCountIs } from 'ai';
import { createLeanSpecTools } from './tools/leanspec-tools';
import { systemPrompt } from './prompts';
import { ConfigManager, type ChatConfig, type Model, type Provider, resolveApiKeyTemplate } from './config';
import { ProviderFactory } from './provider-factory';

type WorkerRequest = {
  id: string;
  type: 'chat' | 'health' | 'reload_config';
  payload?: any;
};

type WorkerResponse = {
  id: string;
  type: 'chunk' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'health_ok' | 'config_reloaded';
  data?: any;
  error?: string;
};

class AiWorker {
  private configManager = ConfigManager.getInstance();
  private configOverride: ChatConfig | null = null;

  async start() {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line: string) => {
      try {
        const request: WorkerRequest = JSON.parse(line);
        await this.handleRequest(request);
      } catch (error) {
        console.error('[worker] Failed to parse request:', error);
      }
    });

    this.send({ id: 'init', type: 'health_ok', data: { ready: true } });
  }

  private getConfig(): ChatConfig {
    return this.configOverride ?? this.configManager.getConfig();
  }

  private setConfig(config: ChatConfig) {
    this.configOverride = config;
  }

  private async handleRequest(request: WorkerRequest) {
    try {
      switch (request.type) {
        case 'chat':
          await this.handleChat(request);
          break;
        case 'health':
          this.send({
            id: request.id,
            type: 'health_ok',
            data: {
              ready: true,
              providers: this.getConfig().providers.map((p: Provider) => p.id),
            },
          });
          break;
        case 'reload_config':
          if (request.payload) {
            this.setConfig(request.payload as ChatConfig);
          }
          this.send({ id: request.id, type: 'config_reloaded' });
          break;
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }
    } catch (error) {
      this.send({
        id: request.id,
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleChat(request: WorkerRequest) {
    const payload = request.payload ?? {};
    const messages = payload.messages;

    if (!Array.isArray(messages)) {
      this.send({ id: request.id, type: 'error', error: 'messages must be an array' });
      return;
    }

    const baseUrl = payload.baseUrl ?? process.env.LEANSPEC_HTTP_URL ?? 'http://127.0.0.1:3000';
    const projectId = payload.projectId as string | undefined;

    const config: ChatConfig = payload.config ?? this.getConfig();

    let selectedProviderId = payload.providerId ?? config.settings.defaultProviderId;
    let selectedModelId = payload.modelId ?? config.settings.defaultModelId;

    if (payload.sessionId) {
      const session = await fetchSessionContext(baseUrl, payload.sessionId as string);
      if (session?.providerId) {
        selectedProviderId = session.providerId;
      }
      if (session?.modelId) {
        selectedModelId = session.modelId;
      }
    }

    const provider = config.providers.find((p: Provider) => p.id === selectedProviderId);
    if (!provider) {
      this.send({ id: request.id, type: 'error', error: `Invalid provider: ${selectedProviderId}` });
      return;
    }

    const model = provider.models.find((m: Model) => m.id === selectedModelId);
    if (!model) {
      this.send({ id: request.id, type: 'error', error: `Invalid model: ${selectedModelId}` });
      return;
    }

    const apiKey = resolveApiKeyTemplate(provider.apiKey);
    if (!apiKey) {
      this.send({
        id: request.id,
        type: 'error',
        error: `API key not configured for provider: ${provider.name}. Please configure it in the settings.`,
      });
      return;
    }

    const tools = createLeanSpecTools({ baseUrl, projectId });

    const transformedMessages = messages.map((msg: any) => {
      if (msg.parts && Array.isArray(msg.parts)) {
        const textContent = msg.parts
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('\n');

        return {
          role: msg.role,
          content: textContent,
        };
      }
      return msg;
    });

    const aiProvider = ProviderFactory.create(provider, apiKey);

    const result = streamText({
      model: aiProvider(model.id) as any,
      tools,
      system: systemPrompt,
      messages: transformedMessages,
      stopWhen: stepCountIs(config.settings.maxSteps),
      onStepFinish: (step: any) => {
        for (const toolCall of step.toolCalls) {
          this.send({
            id: request.id,
            type: 'tool_call',
            data: {
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              args: toolCall.args,
            },
          });
        }

        for (const toolResult of step.toolResults) {
          this.send({
            id: request.id,
            type: 'tool_result',
            data: {
              toolCallId: toolResult.toolCallId,
              result: toolResult.result,
            },
          });
        }
      },
    });

    if (payload.sessionId) {
      void result.text.then((assistantText: string) => {
        const trimmed = assistantText?.trim();
        if (!trimmed) {
          return;
        }
        const persistedMessages = [
          ...transformedMessages,
          { role: 'assistant', content: trimmed },
        ];
        return persistSessionMessages(baseUrl, payload.sessionId as string, {
          projectId,
          providerId: selectedProviderId,
          modelId: selectedModelId,
          messages: persistedMessages,
        });
      });
    }

    for await (const chunk of result.textStream) {
      this.send({
        id: request.id,
        type: 'chunk',
        data: { text: chunk },
      });
    }

    this.send({ id: request.id, type: 'done' });
  }

  private send(response: WorkerResponse) {
    console.log(JSON.stringify(response));
  }
}

async function fetchSessionContext(baseUrl: string, sessionId: string) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat/sessions/${sessionId}`);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { session?: { providerId?: string; modelId?: string } };
    return data?.session ?? null;
  } catch (error) {
    console.warn('[worker] failed to fetch session context:', error);
    return null;
  }
}

async function persistSessionMessages(
  baseUrl: string,
  sessionId: string,
  payload: {
    projectId?: string;
    providerId: string;
    modelId: string;
    messages: Array<{ role: string; content: string }>;
  },
) {
  try {
    await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat/sessions/${sessionId}/messages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('[worker] failed to persist session messages:', error);
  }
}

const worker = new AiWorker();
worker.start().catch((error) => {
  console.error('[worker] Fatal error:', error);
  process.exit(1);
});
