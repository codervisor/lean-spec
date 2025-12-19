import type { Meta, StoryObj } from '@storybook/react';
import { SpecTimeline } from '../src/components/spec/spec-timeline';

const meta: Meta<typeof SpecTimeline> = {
  title: 'Components/Spec/SpecTimeline',
  component: SpecTimeline,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['planned', 'in-progress', 'complete', 'archived'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

export const Planned: Story = {
  args: {
    createdAt: yesterday,
    updatedAt: yesterday,
    status: 'planned',
  },
};

export const InProgress: Story = {
  args: {
    createdAt: weekAgo,
    updatedAt: yesterday,
    status: 'in-progress',
  },
};

export const Complete: Story = {
  args: {
    createdAt: monthAgo,
    updatedAt: weekAgo,
    completedAt: yesterday,
    status: 'complete',
  },
};

export const Archived: Story = {
  args: {
    createdAt: monthAgo,
    updatedAt: weekAgo,
    completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    status: 'archived',
  },
};

export const CustomLabels: Story = {
  args: {
    createdAt: monthAgo,
    updatedAt: weekAgo,
    completedAt: yesterday,
    status: 'complete',
    labels: {
      created: 'Started',
      inProgress: 'Working',
      complete: 'Done',
      archived: 'Archived',
    },
  },
};
