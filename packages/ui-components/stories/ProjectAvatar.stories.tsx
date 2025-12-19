import type { Meta, StoryObj } from '@storybook/react';
import { ProjectAvatar } from '../src/components/project/project-avatar';

const meta: Meta<typeof ProjectAvatar> = {
  title: 'Project/ProjectAvatar',
  component: ProjectAvatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'LeanSpec',
  },
};

export const WithCustomColor: Story = {
  args: {
    name: 'My Project',
    color: '#3b82f6',
  },
};

export const SmallSize: Story = {
  args: {
    name: 'Small',
    size: 'sm',
  },
};

export const LargeSize: Story = {
  args: {
    name: 'Large Avatar',
    size: 'lg',
  },
};

export const ExtraLarge: Story = {
  args: {
    name: 'Extra Large',
    size: 'xl',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ProjectAvatar name="SM" size="sm" />
      <ProjectAvatar name="MD" size="md" />
      <ProjectAvatar name="LG" size="lg" />
      <ProjectAvatar name="XL" size="xl" />
    </div>
  ),
};

export const MultipleProjects: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ProjectAvatar name="Alpha Project" />
      <ProjectAvatar name="Beta Testing" />
      <ProjectAvatar name="Gamma Release" />
      <ProjectAvatar name="Delta Build" />
    </div>
  ),
};

export const WithCustomColors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ProjectAvatar name="Red" color="#ef4444" />
      <ProjectAvatar name="Green" color="#22c55e" />
      <ProjectAvatar name="Blue" color="#3b82f6" />
      <ProjectAvatar name="Purple" color="#8b5cf6" />
    </div>
  ),
};
