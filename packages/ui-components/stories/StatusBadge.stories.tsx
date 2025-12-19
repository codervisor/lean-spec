import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from '../src/components/spec/status-badge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Spec/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['planned', 'in-progress', 'complete', 'archived'],
    },
    iconOnly: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Planned: Story = {
  args: {
    status: 'planned',
  },
};

export const InProgress: Story = {
  args: {
    status: 'in-progress',
  },
};

export const Complete: Story = {
  args: {
    status: 'complete',
  },
};

export const Archived: Story = {
  args: {
    status: 'archived',
  },
};

export const IconOnly: Story = {
  args: {
    status: 'in-progress',
    iconOnly: true,
  },
};

export const CustomLabel: Story = {
  args: {
    status: 'planned',
    label: '待处理',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusBadge status="planned" />
      <StatusBadge status="in-progress" />
      <StatusBadge status="complete" />
      <StatusBadge status="archived" />
    </div>
  ),
};
