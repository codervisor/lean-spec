import type { Meta, StoryObj } from '@storybook/react';
import { ProjectCard } from '../src/components/project/project-card';

const meta: Meta<typeof ProjectCard> = {
  title: 'Project/ProjectCard',
  component: ProjectCard,
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

const sampleProject = {
  id: '1',
  name: 'LeanSpec',
  description: 'Lightweight spec methodology for AI-powered development',
  color: '#3b82f6',
  favorite: true,
  specsCount: 42,
  updatedAt: new Date().toISOString(),
  tags: ['ui', 'components', 'typescript'],
};

export const Default: Story = {
  args: {
    project: sampleProject,
    onClick: () => console.log('Card clicked'),
  },
};

export const WithFavoriteToggle: Story = {
  args: {
    project: sampleProject,
    onClick: () => console.log('Card clicked'),
    onFavoriteToggle: (favorite) => console.log('Favorite toggled:', favorite),
    onMoreOptions: () => console.log('More options clicked'),
  },
};

export const NotFavorite: Story = {
  args: {
    project: {
      ...sampleProject,
      favorite: false,
    },
    onFavoriteToggle: (favorite) => console.log('Favorite toggled:', favorite),
  },
};

export const NoDescription: Story = {
  args: {
    project: {
      ...sampleProject,
      description: null,
    },
  },
};

export const NoTags: Story = {
  args: {
    project: {
      ...sampleProject,
      tags: [],
    },
  },
};

export const ManyTags: Story = {
  args: {
    project: {
      ...sampleProject,
      tags: ['ui', 'components', 'typescript', 'react', 'storybook', 'tailwind'],
    },
  },
};

export const Selected: Story = {
  args: {
    project: sampleProject,
    selected: true,
  },
};

export const SingleSpec: Story = {
  args: {
    project: {
      ...sampleProject,
      specsCount: 1,
    },
  },
};

export const Grid: Story = {
  decorators: [
    () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-[900px]">
        <ProjectCard project={sampleProject} onClick={() => {}} />
        <ProjectCard
          project={{
            id: '2',
            name: 'Project Alpha',
            description: 'An alpha project for testing',
            color: '#22c55e',
            specsCount: 15,
            tags: ['alpha', 'testing'],
          }}
          onClick={() => {}}
        />
        <ProjectCard
          project={{
            id: '3',
            name: 'Documentation',
            description: 'Documentation and guides',
            color: '#f97316',
            favorite: true,
            specsCount: 8,
          }}
          onClick={() => {}}
        />
      </div>
    ),
  ],
};
