import { describe, it, expect } from 'vitest';
import { ProviderFactory } from './provider-factory';
import type { Provider } from './config';

describe('ProviderFactory', () => {
  describe('create', () => {
    it('should create OpenAI provider', () => {
      const provider: Provider = {
        id: 'openai',
        name: 'OpenAI',
        apiKey: 'sk-test',
        models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
      };

      const aiProvider = ProviderFactory.create(provider, 'sk-test-key');
      expect(aiProvider).toBeDefined();
      expect(typeof aiProvider).toBe('function');
    });

    it('should create OpenAI provider with custom baseURL', () => {
      const provider: Provider = {
        id: 'openai',
        name: 'OpenAI',
        baseURL: 'https://custom.openai.com/v1',
        apiKey: 'sk-test',
        models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
      };

      const aiProvider = ProviderFactory.create(provider, 'sk-test-key');
      expect(aiProvider).toBeDefined();
    });

    it('should create Anthropic provider', () => {
      const provider: Provider = {
        id: 'anthropic',
        name: 'Anthropic',
        apiKey: 'sk-ant-test',
        models: [{ id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' }],
      };

      const aiProvider = ProviderFactory.create(provider, 'sk-ant-test-key');
      expect(aiProvider).toBeDefined();
      expect(typeof aiProvider).toBe('function');
    });

    it('should create Google provider', () => {
      const provider: Provider = {
        id: 'google',
        name: 'Google',
        apiKey: 'test-key',
        models: [{ id: 'gemini-pro', name: 'Gemini Pro' }],
      };

      const aiProvider = ProviderFactory.create(provider, 'test-key');
      expect(aiProvider).toBeDefined();
      expect(typeof aiProvider).toBe('function');
    });

    it('should create OpenRouter provider with default baseURL', () => {
      const provider: Provider = {
        id: 'openrouter',
        name: 'OpenRouter',
        apiKey: 'test-key',
        models: [{ id: 'google/gemini-2.0-flash-thinking-exp:free', name: 'Gemini Flash' }],
      };

      const aiProvider = ProviderFactory.create(provider, 'test-key');
      expect(aiProvider).toBeDefined();
      expect(typeof aiProvider).toBe('function');
    });

    it('should create Deepseek provider with default baseURL', () => {
      const provider: Provider = {
        id: 'deepseek',
        name: 'Deepseek',
        apiKey: 'test-key',
        models: [{ id: 'deepseek-reasoner', name: 'Deepseek R1' }],
      };

      const aiProvider = ProviderFactory.create(provider, 'test-key');
      expect(aiProvider).toBeDefined();
      expect(typeof aiProvider).toBe('function');
    });

    it('should create generic OpenAI-compatible provider', () => {
      const provider: Provider = {
        id: 'custom-provider',
        name: 'Custom LLM',
        baseURL: 'https://custom-llm.example.com/v1',
        apiKey: 'test-key',
        models: [{ id: 'custom-model', name: 'Custom Model' }],
      };

      const aiProvider = ProviderFactory.create(provider, 'test-key');
      expect(aiProvider).toBeDefined();
      expect(typeof aiProvider).toBe('function');
    });

    it('should handle provider with custom baseURL', () => {
      const provider: Provider = {
        id: 'openrouter',
        name: 'OpenRouter',
        baseURL: 'https://custom-openrouter.com/api/v1',
        apiKey: 'test-key',
        models: [{ id: 'test-model', name: 'Test' }],
      };

      const aiProvider = ProviderFactory.create(provider, 'test-key');
      expect(aiProvider).toBeDefined();
    });
  });

  describe('provider compatibility', () => {
    it('should support all default providers', () => {
      const defaultProviders: Provider[] = [
        {
          id: 'openai',
          name: 'OpenAI',
          apiKey: 'sk-test',
          models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          apiKey: 'sk-ant-test',
          models: [{ id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' }],
        },
        {
          id: 'google',
          name: 'Google',
          apiKey: 'test',
          models: [{ id: 'gemini-pro', name: 'Gemini Pro' }],
        },
        {
          id: 'deepseek',
          name: 'Deepseek',
          baseURL: 'https://api.deepseek.com/v1',
          apiKey: 'test',
          models: [{ id: 'deepseek-reasoner', name: 'Deepseek R1' }],
        },
        {
          id: 'openrouter',
          name: 'OpenRouter',
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: 'test',
          models: [{ id: 'test-model', name: 'Test' }],
        },
      ];

      defaultProviders.forEach((provider) => {
        const aiProvider = ProviderFactory.create(provider, 'test-key');
        expect(aiProvider).toBeDefined();
        expect(typeof aiProvider).toBe('function');
      });
    });
  });
});
