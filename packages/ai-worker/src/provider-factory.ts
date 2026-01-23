import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { Provider } from './config';

export class ProviderFactory {
  static create(provider: Provider, apiKey: string) {
    const baseURL = provider.baseURL;

    switch (provider.id) {
      case 'openai':
        return createOpenAI({ apiKey, baseURL });

      case 'anthropic':
        return createAnthropic({ apiKey, baseURL });

      case 'google':
        return createGoogleGenerativeAI({ apiKey });

      case 'openrouter':
        return createOpenAI({
          apiKey,
          baseURL: baseURL ?? 'https://openrouter.ai/api/v1',
        });

      case 'deepseek':
        return createOpenAI({
          apiKey,
          baseURL: baseURL ?? 'https://api.deepseek.com/v1',
        });

      default:
        return createOpenAI({ apiKey, baseURL });
    }
  }
}
