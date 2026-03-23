import { useQuery } from '@tanstack/react-query';

export type ProjectSource = 'local' | 'github';

export interface Capabilities {
  projectSources: ProjectSource[];
  readonly: boolean;
}

const VITE_FALLBACK: ProjectSource[] = (() => {
  const env = import.meta.env.VITE_PROJECT_SOURCES as string | undefined;
  if (env) {
    return env.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) as ProjectSource[];
  }
  return ['local', 'github'];
})();

async function fetchCapabilities(): Promise<Capabilities> {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${baseUrl}/api/capabilities`);
  if (!res.ok) throw new Error('Failed to fetch capabilities');
  return res.json();
}

export function useCapabilities() {
  const query = useQuery({
    queryKey: ['capabilities'],
    queryFn: fetchCapabilities,
    staleTime: 5 * 60 * 1000, // 5 min — capabilities rarely change
    retry: 1,
    // Fall back to build-time env var if server doesn't support the endpoint
    placeholderData: {
      projectSources: VITE_FALLBACK,
      readonly: false,
    },
  });

  const capabilities = query.data ?? {
    projectSources: VITE_FALLBACK,
    readonly: false,
  };

  return {
    ...query,
    capabilities,
    hasSource: (source: ProjectSource) => capabilities.projectSources.includes(source),
  };
}
