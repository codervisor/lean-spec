import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from '../src/components/stats/progress-bar';

const meta: Meta<typeof ProgressBar> = {
  title: 'Stats/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 67,
  },
};

export const WithLabel: Story = {
  args: {
    value: 75,
    label: 'Completion Progress',
  },
};

export const WithPercentage: Story = {
  args: {
    value: 42,
    showPercentage: true,
  },
};

export const WithLabelAndPercentage: Story = {
  args: {
    value: 88,
    label: 'Tasks Completed',
    showPercentage: true,
  },
};

export const Success: Story = {
  args: {
    value: 100,
    label: 'All Done!',
    variant: 'success',
    showPercentage: true,
  },
};

export const Warning: Story = {
  args: {
    value: 45,
    label: 'Needs Attention',
    variant: 'warning',
    showPercentage: true,
  },
};

export const Danger: Story = {
  args: {
    value: 15,
    label: 'Critical',
    variant: 'danger',
    showPercentage: true,
  },
};

export const Info: Story = {
  args: {
    value: 60,
    label: 'Loading...',
    variant: 'info',
  },
};

export const Small: Story = {
  args: {
    value: 50,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    value: 50,
    size: 'lg',
  },
};

export const AllSizes: Story = {
  decorators: [
    () => (
      <div className="space-y-4 w-[300px]">
        <ProgressBar value={50} size="sm" label="Small" />
        <ProgressBar value={50} size="md" label="Medium" />
        <ProgressBar value={50} size="lg" label="Large" />
      </div>
    ),
  ],
};

export const AllVariants: Story = {
  decorators: [
    () => (
      <div className="space-y-4 w-[300px]">
        <ProgressBar value={50} variant="default" label="Default" showPercentage />
        <ProgressBar value={100} variant="success" label="Success" showPercentage />
        <ProgressBar value={45} variant="warning" label="Warning" showPercentage />
        <ProgressBar value={15} variant="danger" label="Danger" showPercentage />
        <ProgressBar value={60} variant="info" label="Info" showPercentage />
      </div>
    ),
  ],
};
