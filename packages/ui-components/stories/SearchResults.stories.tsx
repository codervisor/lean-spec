import type { Meta, StoryObj } from '@storybook/react';
import { SearchResults } from '../src/components/search/search-results';
import type { LightweightSpec } from '../src/types/specs';

const meta = {
  title: 'Search/SearchResults',
  component: SearchResults,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SearchResults>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSpecs: LightweightSpec[] = [
  {
    id: '185',
    specNumber: 185,
    specName: '185-ui-components-extraction',
    title: 'UI Components Extraction',
    status: 'in-progress',
    priority: 'high',
    tags: ['ui', 'components', 'architecture'],
    updated_at: '2025-12-18T15:18:04.045Z',
  },
  {
    id: '184',
    specNumber: 184,
    specName: '184-ui-packages-consolidation',
    title: 'UI Packages Consolidation',
    status: 'complete',
    priority: 'high',
    tags: ['ui', 'architecture'],
    updated_at: '2025-12-17T10:00:00.000Z',
  },
  {
    id: '186',
    specNumber: 186,
    specName: '186-rust-http-server',
    title: 'Rust HTTP Server',
    status: 'planned',
    priority: 'high',
    tags: ['rust', 'backend'],
    updated_at: '2025-12-18T12:00:00.000Z',
  },
];

export const WithResults: Story = {
  args: {
    results: mockSpecs,
    query: 'ui',
    onSpecClick: (specId) => console.log('Clicked spec:', specId),
  },
};

export const NoResults: Story = {
  args: {
    results: [],
    query: 'nonexistent',
  },
};

export const EmptyQuery: Story = {
  args: {
    results: [],
    query: '',
  },
};

export const Searching: Story = {
  args: {
    results: [],
    query: 'searching...',
    isSearching: true,
  },
};

export const ManyResults: Story = {
  args: {
    results: Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      specNumber: i + 1,
      specName: `${i + 1}-example-spec`,
      title: `Example Spec ${i + 1}`,
      status: ['planned', 'in-progress', 'complete'][i % 3] as any,
      priority: ['low', 'medium', 'high'][i % 3] as any,
      tags: ['example', 'test'],
      updated_at: new Date(Date.now() - i * 86400000).toISOString(),
    })),
    query: 'example',
    onSpecClick: (specId) => console.log('Clicked spec:', specId),
  },
};
