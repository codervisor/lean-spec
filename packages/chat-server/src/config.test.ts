import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigManager, ChatConfigSchema } from './config';

describe('ConfigManager', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    // Reset singleton instance between tests
    (ConfigManager as any).instance = undefined;
    
    // Create temporary directory for test configs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leanspec-test-'));
    configPath = path.join(tempDir, 'chat-config.json');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadConfig', () => {
    it('should load default config when file does not exist', () => {
      const manager = ConfigManager.getInstance(configPath);
      const config = manager.getConfig();

      expect(config.version).toBe('1.0');
      expect(config.providers).toBeDefined();
      expect(config.settings.defaultProviderId).toBe('openai');
      expect(config.settings.defaultModelId).toBe('gpt-4o');
    });

    it('should load config from file when it exists', () => {
      const testConfig = {
        version: '1.0',
        providers: [
          {
            id: 'test-provider',
            name: 'Test Provider',
            apiKey: 'test-key',
            models: [
              {
                id: 'test-model',
                name: 'Test Model',
                maxTokens: 1000,
              },
            ],
          },
        ],
        settings: {
          maxSteps: 5,
          defaultProviderId: 'test-provider',
          defaultModelId: 'test-model',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(testConfig), 'utf-8');
      const manager = ConfigManager.getInstance(configPath);
      const config = manager.getConfig();

      expect(config.version).toBe('1.0');
      expect(config.providers.length).toBe(1);
      expect(config.providers[0].id).toBe('test-provider');
      expect(config.settings.maxSteps).toBe(5);
    });

    it('should return default config for invalid JSON', () => {
      fs.writeFileSync(configPath, 'invalid json', 'utf-8');
      const manager = ConfigManager.getInstance(configPath);
      const config = manager.getConfig();

      expect(config.version).toBe('1.0');
      expect(config.providers).toBeDefined();
    });
  });

  describe('environment variable interpolation', () => {
    it('should resolve ${VAR_NAME} syntax', () => {
      process.env.TEST_API_KEY = 'sk-test-123';
      const manager = ConfigManager.getInstance(configPath);
      const apiKey = manager.resolveProviderApiKey('openai');

      // Default config uses ${OPENAI_API_KEY}
      expect(apiKey).toBe(process.env.OPENAI_API_KEY ?? '');
      delete process.env.TEST_API_KEY;
    });

    it('should return empty string for missing environment variables', () => {
      delete process.env.NONEXISTENT_KEY;
      const testConfig = {
        version: '1.0',
        providers: [
          {
            id: 'test',
            name: 'Test',
            apiKey: '${NONEXISTENT_KEY}',
            models: [{ id: 'm1', name: 'M1' }],
          },
        ],
        settings: {
          maxSteps: 10,
          defaultProviderId: 'test',
          defaultModelId: 'm1',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(testConfig), 'utf-8');
      const manager = ConfigManager.getInstance(configPath);
      const apiKey = manager.resolveProviderApiKey('test');

      expect(apiKey).toBe('');
    });

    it('should return literal value for non-template strings', () => {
      const testConfig = {
        version: '1.0',
        providers: [
          {
            id: 'test',
            name: 'Test',
            apiKey: 'literal-key-123',
            models: [{ id: 'm1', name: 'M1' }],
          },
        ],
        settings: {
          maxSteps: 10,
          defaultProviderId: 'test',
          defaultModelId: 'm1',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(testConfig), 'utf-8');
      const manager = ConfigManager.getInstance(configPath);
      const apiKey = manager.resolveProviderApiKey('test');

      expect(apiKey).toBe('literal-key-123');
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      const manager = ConfigManager.getInstance(configPath);
      const newConfig = {
        version: '1.0',
        providers: [
          {
            id: 'new-provider',
            name: 'New Provider',
            apiKey: 'new-key',
            models: [{ id: 'new-model', name: 'New Model' }],
          },
        ],
        settings: {
          maxSteps: 15,
          defaultProviderId: 'new-provider',
          defaultModelId: 'new-model',
        },
      };

      manager.saveConfig(newConfig);

      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(saved.providers[0].id).toBe('new-provider');
      expect(saved.settings.maxSteps).toBe(15);
    });

    it('should create directory if it does not exist', () => {
      const nestedPath = path.join(tempDir, 'nested', 'chat-config.json');
      const manager = ConfigManager.getInstance(nestedPath);

      const config = manager.getConfig();
      manager.saveConfig(config);

      expect(fs.existsSync(nestedPath)).toBe(true);
    });

    it('should throw error for invalid config', () => {
      const manager = ConfigManager.getInstance(configPath);
      const invalidConfig = {
        version: '1.0',
        providers: [],
        settings: {
          maxSteps: 100, // exceeds max of 50
          defaultProviderId: 'test',
          defaultModelId: 'test',
        },
      };

      expect(() => manager.saveConfig(invalidConfig as any)).toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should merge provider API keys', () => {
      process.env.SECRET_KEY = 'secret-123';
      const initialConfig = {
        version: '1.0',
        providers: [
          {
            id: 'provider1',
            name: 'Provider 1',
            apiKey: '${SECRET_KEY}',
            models: [{ id: 'm1', name: 'M1' }],
          },
        ],
        settings: {
          maxSteps: 10,
          defaultProviderId: 'provider1',
          defaultModelId: 'm1',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(initialConfig), 'utf-8');
      const manager = ConfigManager.getInstance(configPath);

      // Update without providing API key (should preserve existing)
      manager.updateConfig({
        version: '1.0',
        providers: [
          {
            id: 'provider1',
            name: 'Provider 1 Updated',
            models: [{ id: 'm1', name: 'M1' }, { id: 'm2', name: 'M2' }],
          },
        ],
        settings: {
          maxSteps: 10,
          defaultProviderId: 'provider1',
          defaultModelId: 'm1',
        },
      });

      const updated = manager.getConfig();
      expect(updated.providers[0].apiKey).toBe('${SECRET_KEY}');
      expect(updated.providers[0].name).toBe('Provider 1 Updated');
      expect(updated.providers[0].models.length).toBe(2);

      delete process.env.SECRET_KEY;
    });
  });

  describe('getProvider', () => {
    it('should return provider by id', () => {
      const manager = ConfigManager.getInstance(configPath);
      const provider = manager.getProvider('openai');

      expect(provider).toBeDefined();
      expect(provider?.id).toBe('openai');
      expect(provider?.name).toBe('OpenAI');
    });

    it('should return undefined for non-existent provider', () => {
      const manager = ConfigManager.getInstance(configPath);
      const provider = manager.getProvider('non-existent');

      expect(provider).toBeUndefined();
    });
  });

  describe('getModel', () => {
    it('should return model by provider and model id', () => {
      const manager = ConfigManager.getInstance(configPath);
      const model = manager.getModel('openai', 'gpt-4o');

      expect(model).toBeDefined();
      expect(model?.id).toBe('gpt-4o');
      expect(model?.name).toBe('GPT-4o');
    });

    it('should return undefined for non-existent model', () => {
      const manager = ConfigManager.getInstance(configPath);
      const model = manager.getModel('openai', 'non-existent');

      expect(model).toBeUndefined();
    });

    it('should return undefined for non-existent provider', () => {
      const manager = ConfigManager.getInstance(configPath);
      const model = manager.getModel('non-existent', 'gpt-4o');

      expect(model).toBeUndefined();
    });
  });

  describe('getConfigForClient', () => {
    it('should redact API keys', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      const manager = ConfigManager.getInstance(configPath);
      const clientConfig = manager.getConfigForClient();

      expect(clientConfig.providers[0]).not.toHaveProperty('apiKey');
      expect(clientConfig.providers[0].hasApiKey).toBe(true);

      delete process.env.OPENAI_API_KEY;
    });

    it('should indicate missing API keys', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      const manager = ConfigManager.getInstance(configPath);
      const clientConfig = manager.getConfigForClient();

      const openaiProvider = clientConfig.providers.find((p) => p.id === 'openai');
      expect(openaiProvider?.hasApiKey).toBe(false);
    });
  });

  describe('ChatConfigSchema validation', () => {
    it('should validate correct config', () => {
      const validConfig = {
        version: '1.0',
        providers: [
          {
            id: 'test',
            name: 'Test',
            apiKey: 'key',
            models: [{ id: 'm1', name: 'M1' }],
          },
        ],
        settings: {
          maxSteps: 10,
          defaultProviderId: 'test',
          defaultModelId: 'm1',
        },
      };

      expect(() => ChatConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject config with invalid maxSteps', () => {
      const invalidConfig = {
        version: '1.0',
        providers: [],
        settings: {
          maxSteps: 0, // below minimum
          defaultProviderId: 'test',
          defaultModelId: 'test',
        },
      };

      expect(() => ChatConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject config with maxSteps exceeding limit', () => {
      const invalidConfig = {
        version: '1.0',
        providers: [],
        settings: {
          maxSteps: 51, // exceeds maximum of 50
          defaultProviderId: 'test',
          defaultModelId: 'test',
        },
      };

      expect(() => ChatConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject config with invalid provider baseURL', () => {
      const invalidConfig = {
        version: '1.0',
        providers: [
          {
            id: 'test',
            name: 'Test',
            baseURL: 'not-a-url',
            apiKey: 'key',
            models: [],
          },
        ],
        settings: {
          maxSteps: 10,
          defaultProviderId: 'test',
          defaultModelId: 'test',
        },
      };

      expect(() => ChatConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should allow optional baseURL', () => {
      const validConfig = {
        version: '1.0',
        providers: [
          {
            id: 'test',
            name: 'Test',
            apiKey: 'key',
            models: [{ id: 'm1', name: 'M1' }],
          },
        ],
        settings: {
          maxSteps: 10,
          defaultProviderId: 'test',
          defaultModelId: 'm1',
        },
      };

      expect(() => ChatConfigSchema.parse(validConfig)).not.toThrow();
    });
  });
});
