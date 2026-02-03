export interface ModelsRegistryResponse {
  providers: ModelsRegistryProviderRaw[];
  configuredProviderIds: string[];
  total: number;
  configuredCount: number;
}

export interface ModelsRegistryProviderRaw {
  id: string;
  name: string;
  env?: string[];
  npm?: string;
  api?: string;
  doc?: string;
  models?: Record<string, ModelsRegistryModelRaw>;
  isConfigured: boolean;
  configuredEnvVars?: string[];
}

export interface ModelsRegistryModelRaw {
  id: string;
  name: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  open_weights?: boolean;
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit?: {
    context?: number;
    output?: number;
  };
}

export interface RegistryModel {
  id: string;
  name: string;
  toolCall: boolean;
  reasoning: boolean;
  vision: boolean;
  contextWindow?: number;
  maxOutput?: number;
  inputCost?: number;
  outputCost?: number;
}

export interface RegistryProvider {
  id: string;
  name: string;
  isConfigured: boolean;
  configuredEnvVars: string[];
  models: RegistryModel[];
}
