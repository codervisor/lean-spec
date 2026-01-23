import fs from 'fs';
import os from 'os';
import path from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { z } from 'zod';

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.leanspec', 'chat-config.json');

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxTokens: z.number().optional(),
  default: z.boolean().optional(),
});

export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseURL: z.string().url().optional(),
  apiKey: z.string(),
  models: z.array(ModelSchema),
});

const ProviderUpdateSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseURL: z.string().url().optional(),
  apiKey: z.string().optional(),
  models: z.array(ModelSchema),
  hasApiKey: z.boolean().optional(),
});

export const ChatConfigSchema = z.object({
  version: z.string(),
  providers: z.array(ProviderSchema),
  settings: z.object({
    maxSteps: z.number().min(1).max(50),
    defaultProviderId: z.string(),
    defaultModelId: z.string(),
  }),
});

const ChatConfigUpdateSchema = z.object({
  version: z.string(),
  providers: z.array(ProviderUpdateSchema),
  settings: z.object({
    maxSteps: z.number().min(1).max(50),
    defaultProviderId: z.string(),
    defaultModelId: z.string(),
  }),
});

export interface Model {
  id: string;
  name: string;
  maxTokens?: number;
  default?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  baseURL?: string;
  apiKey: string;
  models: Model[];
}

export interface ProviderUpdate {
  id: string;
  name: string;
  baseURL?: string;
  apiKey?: string;
  models: Model[];
  hasApiKey?: boolean;
}

export interface ChatConfig {
  version: string;
  providers: Provider[];
  settings: {
    maxSteps: number;
    defaultProviderId: string;
    defaultModelId: string;
  };
}

export interface ChatConfigUpdate {
  version: string;
  providers: ProviderUpdate[];
  settings: {
    maxSteps: number;
    defaultProviderId: string;
    defaultModelId: string;
  };
}

const DEFAULT_CONFIG: ChatConfig = {
  version: '1.0',
  providers: [
    {
      id: 'openai',
      name: 'OpenAI',
      apiKey: '${OPENAI_API_KEY}',
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          default: true,
          maxTokens: 128000,
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          maxTokens: 128000,
        },
      ],
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      apiKey: '${ANTHROPIC_API_KEY}',
      models: [
        {
          id: 'claude-sonnet-4-5',
          name: 'Claude Sonnet 4.5',
          maxTokens: 200000,
        },
      ],
    },
    {
      id: 'deepseek',
      name: 'Deepseek',
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: '${DEEPSEEK_API_KEY}',
      models: [
        {
          id: 'deepseek-reasoner',
          name: 'Deepseek R1',
          maxTokens: 64000,
        },
      ],
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: '${OPENROUTER_API_KEY}',
      models: [
        {
          id: 'google/gemini-2.0-flash-thinking-exp:free',
          name: 'Gemini 2.0 Flash (Free)',
          maxTokens: 32000,
        },
      ],
    },
  ],
  settings: {
    maxSteps: 10,
    defaultProviderId: 'openai',
    defaultModelId: 'gpt-4o',
  },
};

function resolveApiKey(template: string): string {
  const match = template.match(/\$\{([^}]+)\}/);
  if (match) {
    return process.env[match[1]] ?? '';
  }
  return template;
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ChatConfig;
  private configPath: string;
  private watcher?: FSWatcher;

  private constructor(configPath: string = DEFAULT_CONFIG_PATH) {
    this.configPath = configPath;
    this.config = this.loadConfig();
    this.startWatcher();
  }

  static getInstance(configPath?: string): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(configPath);
    }
    return ConfigManager.instance;
  }

  getConfig(): ChatConfig {
    return this.config;
  }

  getProvider(providerId: string): Provider | undefined {
    return this.config.providers.find((provider: Provider) => provider.id === providerId);
  }

  getModel(providerId: string, modelId: string): Model | undefined {
    const provider = this.getProvider(providerId);
    return provider?.models.find((model: Model) => model.id === modelId);
  }

  resolveProviderApiKey(providerId: string): string {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return '';
    }
    return resolveApiKey(provider.apiKey);
  }

  updateConfig(input: unknown): void {
    const update: ChatConfigUpdate = ChatConfigUpdateSchema.parse(input);
    const existingProviders = new Map(
      this.config.providers.map((provider: Provider) => [provider.id, provider])
    );

    const mergedProviders: Provider[] = update.providers.map((provider: ProviderUpdate) => {
      const existing = existingProviders.get(provider.id);
      return {
        id: provider.id,
        name: provider.name,
        baseURL: provider.baseURL,
        apiKey: provider.apiKey ?? existing?.apiKey ?? '',
        models: provider.models,
      };
    });

    this.saveConfig({
      version: update.version,
      providers: mergedProviders,
      settings: update.settings,
    });
  }

  getConfigForClient(): Omit<ChatConfig, 'providers'> & {
    providers: Array<Omit<Provider, 'apiKey'> & { hasApiKey: boolean }>;
  } {
    return {
      ...this.config,
      providers: this.config.providers.map((p: Provider) => {
        const resolved = resolveApiKey(p.apiKey);
        return {
          id: p.id,
          name: p.name,
          baseURL: p.baseURL,
          models: p.models,
          hasApiKey: resolved.length > 0,
        };
      }),
    };
  }

  private loadConfig(): ChatConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(content);
        return ChatConfigSchema.parse(parsed);
      }
    } catch (error) {
      console.warn('[config] failed to load config, using defaults:', error);
    }

    return DEFAULT_CONFIG;
  }

  private startWatcher() {
    try {
      this.watcher = chokidar.watch(this.configPath, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
      });

      const reload = (event: string) => {
        try {
          this.config = this.loadConfig();
          console.log(`[config] reloaded (${event})`);
        } catch (error) {
          console.warn('[config] reload failed:', error);
        }
      };

      this.watcher.on('change', () => reload('change'));
      this.watcher.on('add', () => reload('add'));
    } catch (error) {
      console.warn('[config] watcher failed to start:', error);
    }
  }

  private saveConfig(config: ChatConfig): void {
    try {
      ChatConfigSchema.parse(config);
      const dir = path.dirname(this.configPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      this.config = config;
      console.log('[config] saved to', this.configPath);
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export function resolveApiKeyTemplate(template: string): string {
  return resolveApiKey(template);
}
