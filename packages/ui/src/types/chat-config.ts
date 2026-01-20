export interface Model {
  id: string;
  name: string;
  maxTokens?: number;
  contextWindow?: string;
  pricing?: { input: number; output: number };
  default?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  baseURL?: string;
  models: Model[];
  hasApiKey: boolean;
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
