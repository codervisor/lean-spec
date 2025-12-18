import type { Meta, StoryObj } from '@storybook/react';
import { PriorityBadge } from '../src/components/spec/priority-badge';

const meta: Meta<typeof PriorityBadge> = {
  title: 'Spec/PriorityBadge',
  component: PriorityBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    priority: {
      control: 'select',
      options: ['low', 'medium', 'high', 'critical'],
    },
    iconOnly: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Low: Story = {
  args: {
    priority: 'low',
  },
};

export const Medium: Story = {
  args: {
    priority: 'medium',
  },
};

export const High: Story = {
  args: {
    priority: 'high',
  },
};

export const Critical: Story = {
  args: {
    priority: 'critical',
  },
};

export const IconOnly: Story = {
  args: {
    priority: 'high',
    iconOnly: true,
  },
};

export const CustomLabel: Story = {
  args: {
    priority: 'critical',
    label: '紧急',
  },
};

export const AllPriorities: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <PriorityBadge priority="low" />
      <PriorityBadge priority="medium" />
      <PriorityBadge priority="high" />
      <PriorityBadge priority="critical" />
    </div>
  ),
};
