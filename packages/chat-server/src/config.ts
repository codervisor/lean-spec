import fs from 'fs';
import os from 'os';
import path from 'path';
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

export const ChatConfigSchema = z.object({
  version: z.string(),
  providers: z.array(ProviderSchema),
  settings: z.object({
    maxSteps: z.number().min(1).max(50),
    defaultProviderId: z.string(),
    defaultModelId: z.string(),
  }),
});

export type Model = z.infer<typeof ModelSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type ChatConfig = z.infer<typeof ChatConfigSchema>;

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

  private constructor(configPath: string = DEFAULT_CONFIG_PATH) {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  static getInstance(configPath?: string): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(configPath);
    }
    return ConfigManager.instance;
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
    
    // Return default config if file doesn't exist or parsing fails
    return DEFAULT_CONFIG;
  }

  saveConfig(config: ChatConfig): void {
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

  getConfig(): ChatConfig {
    return this.config;
  }

  getProvider(id: string): Provider | undefined {
    return this.config.providers.find((p) => p.id === id);
  }

  getModel(providerId: string, modelId: string): Model | undefined {
    const provider = this.getProvider(providerId);
    return provider?.models.find((m) => m.id === modelId);
  }

  resolveProviderApiKey(providerId: string): string {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return '';
    }
    return resolveApiKey(provider.apiKey);
  }

  getConfigForClient(): Omit<ChatConfig, 'providers'> & {
    providers: Array<Omit<Provider, 'apiKey'> & { hasApiKey: boolean }>;
  } {
    // Return config without exposing API keys to client
    return {
      ...this.config,
      providers: this.config.providers.map((p) => {
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
}
