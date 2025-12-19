import type { Meta, StoryObj } from '@storybook/react';
import { StatusEditor } from '../src/components/spec/status-editor';
import { useState } from 'react';

const meta: Meta<typeof StatusEditor> = {
  title: 'Components/Spec/StatusEditor',
  component: StatusEditor,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [status, setStatus] = useState<'planned' | 'in-progress' | 'complete' | 'archived'>('planned');
    return (
      <StatusEditor
        currentStatus={status}
        onStatusChange={async (newStatus) => {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));
          setStatus(newStatus);
        }}
      />
    );
  },
};

export const InProgress: Story = {
  render: () => {
    const [status, setStatus] = useState<'planned' | 'in-progress' | 'complete' | 'archived'>('in-progress');
    return (
      <StatusEditor
        currentStatus={status}
        onStatusChange={async (newStatus) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setStatus(newStatus);
        }}
      />
    );
  },
};

export const Complete: Story = {
  render: () => {
    const [status, setStatus] = useState<'planned' | 'in-progress' | 'complete' | 'archived'>('complete');
    return (
      <StatusEditor
        currentStatus={status}
        onStatusChange={async (newStatus) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setStatus(newStatus);
        }}
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    currentStatus: 'planned',
    onStatusChange: async () => {},
    disabled: true,
  },
};

export const WithError: Story = {
  render: () => {
    const [status, setStatus] = useState<'planned' | 'in-progress' | 'complete' | 'archived'>('planned');
    return (
      <StatusEditor
        currentStatus={status}
        onStatusChange={async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          throw new Error('Failed to update status');
        }}
      />
    );
  },
};
