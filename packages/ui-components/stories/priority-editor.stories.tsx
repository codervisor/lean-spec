import type { Meta, StoryObj } from '@storybook/react';
import { PriorityEditor } from '../src/components/spec/priority-editor';
import { useState } from 'react';

const meta: Meta<typeof PriorityEditor> = {
  title: 'Components/Spec/PriorityEditor',
  component: PriorityEditor,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
    return (
      <PriorityEditor
        currentPriority={priority}
        onPriorityChange={async (newPriority) => {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));
          setPriority(newPriority);
        }}
      />
    );
  },
};

export const High: Story = {
  render: () => {
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
    return (
      <PriorityEditor
        currentPriority={priority}
        onPriorityChange={async (newPriority) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setPriority(newPriority);
        }}
      />
    );
  },
};

export const Critical: Story = {
  render: () => {
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('critical');
    return (
      <PriorityEditor
        currentPriority={priority}
        onPriorityChange={async (newPriority) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setPriority(newPriority);
        }}
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    currentPriority: 'medium',
    onPriorityChange: async () => {},
    disabled: true,
  },
};

export const WithError: Story = {
  render: () => {
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
    return (
      <PriorityEditor
        currentPriority={priority}
        onPriorityChange={async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          throw new Error('Failed to update priority');
        }}
      />
    );
  },
};
