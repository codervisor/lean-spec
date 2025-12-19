import type { Meta, StoryObj } from '@storybook/react';
import { SpecDependencyGraph } from '../src/components/graph/dependency-graph';
import type { CompleteSpecRelationships } from '../src/types/specs';

const meta = {
  title: 'Graph/SpecDependencyGraph',
  component: SpecDependencyGraph,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SpecDependencyGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockRelationships: CompleteSpecRelationships = {
  current: {
    specNumber: 185,
    specName: '185-ui-components-extraction',
    title: 'UI Components Extraction',
    status: 'in-progress',
    priority: 'high',
  },
  dependsOn: [
    {
      specNumber: 184,
      specName: '184-ui-packages-consolidation',
      title: 'UI Packages Consolidation',
      status: 'complete',
      priority: 'high',
    },
  ],
  requiredBy: [
    {
      specNumber: 186,
      specName: '186-rust-http-server',
      title: 'Rust HTTP Server',
      status: 'planned',
      priority: 'high',
    },
    {
      specNumber: 187,
      specName: '187-vite-spa-migration',
      title: 'Vite SPA Migration',
      status: 'planned',
      priority: 'high',
    },
  ],
};

export const Default: Story = {
  args: {
    relationships: mockRelationships,
    specNumber: 185,
    specTitle: 'UI Components Extraction',
    onNodeClick: (specId) => console.log('Clicked spec:', specId),
  },
  render: (args) => (
    <div style={{ width: '100%', height: '600px' }}>
      <SpecDependencyGraph {...args} />
    </div>
  ),
};

export const WithManyDependencies: Story = {
  args: {
    relationships: {
      current: {
        specNumber: 100,
        specName: '100-example-spec',
        title: 'Example Spec',
        status: 'in-progress',
        priority: 'medium',
      },
      dependsOn: [
        {
          specNumber: 95,
          specName: '95-prerequisite-1',
          title: 'Prerequisite 1',
          status: 'complete',
          priority: 'high',
        },
        {
          specNumber: 96,
          specName: '96-prerequisite-2',
          title: 'Prerequisite 2',
          status: 'in-progress',
          priority: 'medium',
        },
        {
          specNumber: 97,
          specName: '97-prerequisite-3',
          title: 'Prerequisite 3',
          status: 'planned',
          priority: 'low',
        },
      ],
      requiredBy: [
        {
          specNumber: 101,
          specName: '101-dependent-1',
          title: 'Dependent 1',
          status: 'planned',
          priority: 'high',
        },
        {
          specNumber: 102,
          specName: '102-dependent-2',
          title: 'Dependent 2',
          status: 'planned',
          priority: 'medium',
        },
      ],
    },
    specNumber: 100,
    specTitle: 'Example Spec',
  },
  render: (args) => (
    <div style={{ width: '100%', height: '600px' }}>
      <SpecDependencyGraph {...args} />
    </div>
  ),
};

export const CustomLabels: Story = {
  args: {
    ...Default.args,
    labels: {
      title: 'Dependency Visualization',
      subtitle: 'Click on any spec to navigate',
      badge: 'Beta',
      currentBadge: 'THIS SPEC',
      currentSubtitle: 'You are here',
      dependsOnBadge: 'REQUIRED',
      requiredByBadge: 'BLOCKS',
      completedSubtitle: '✓ Done',
      inProgressSubtitle: '⏳ Working',
      plannedBlockingSubtitle: '⚠️ Blocked',
      plannedCanProceedSubtitle: '✓ Ready',
    },
  },
  render: (args) => (
    <div style={{ width: '100%', height: '600px' }}>
      <SpecDependencyGraph {...args} />
    </div>
  ),
};
