import type { Meta, StoryObj } from '@storybook/react';
import { SpecCard } from '../src/components/spec/spec-card';

const meta: Meta<typeof SpecCard> = {
  title: 'Spec/SpecCard',
  component: SpecCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[350px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleSpec = {
  specNumber: 185,
  specName: 'ui-components-extraction',
  title: 'UI Components Extraction',
  status: 'in-progress',
  priority: 'high',
  tags: ['ui', 'components', 'architecture'],
  updatedAt: new Date().toISOString(),
};

export const Default: Story = {
  args: {
    spec: sampleSpec,
  },
};

export const Planned: Story = {
  args: {
    spec: {
      ...sampleSpec,
      status: 'planned',
      priority: 'medium',
    },
  },
};

export const Complete: Story = {
  args: {
    spec: {
      ...sampleSpec,
      status: 'complete',
      priority: 'high',
    },
  },
};

export const Selected: Story = {
  args: {
    spec: sampleSpec,
    selected: true,
  },
};

export const ManyTags: Story = {
  args: {
    spec: {
      ...sampleSpec,
      tags: ['ui', 'components', 'react', 'typescript', 'vite', 'storybook', 'testing'],
    },
    maxTags: 4,
  },
};

export const WithoutTitle: Story = {
  args: {
    spec: {
      specNumber: 42,
      specName: 'feature-implementation',
      title: null,
      status: 'planned',
      priority: 'low',
      tags: ['feature'],
      updatedAt: null,
    },
  },
};

export const Grid: Story = {
  decorators: [
    () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-[900px]">
        <SpecCard spec={sampleSpec} />
        <SpecCard
          spec={{ ...sampleSpec, specNumber: 186, title: 'Rust HTTP Server', status: 'planned' }}
        />
        <SpecCard
          spec={{ ...sampleSpec, specNumber: 187, title: 'Vite SPA Migration', status: 'complete' }}
        />
      </div>
    ),
  ],
};
