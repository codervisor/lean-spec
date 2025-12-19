import type { Meta, StoryObj } from '@storybook/react';
import { StatsOverview } from '../src/components/stats/stats-overview';

const meta: Meta<typeof StatsOverview> = {
  title: 'Stats/StatsOverview',
  component: StatsOverview,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleStats = {
  totalSpecs: 42,
  completedSpecs: 28,
  inProgressSpecs: 8,
  plannedSpecs: 6,
  archivedSpecs: 0,
  completionRate: 67,
};

export const Default: Story = {
  args: {
    stats: sampleStats,
  },
};

export const WithArchived: Story = {
  args: {
    stats: {
      ...sampleStats,
      archivedSpecs: 5,
    },
    showArchived: true,
  },
};

export const ZeroCompletion: Story = {
  args: {
    stats: {
      totalSpecs: 10,
      completedSpecs: 0,
      inProgressSpecs: 3,
      plannedSpecs: 7,
      completionRate: 0,
    },
  },
};

export const FullCompletion: Story = {
  args: {
    stats: {
      totalSpecs: 15,
      completedSpecs: 15,
      inProgressSpecs: 0,
      plannedSpecs: 0,
      completionRate: 100,
    },
  },
};

export const CustomLabels: Story = {
  args: {
    stats: sampleStats,
    labels: {
      total: '总规格',
      totalSubtitle: '所有规格',
      completed: '已完成',
      completedSubtitle: '完成率',
      inProgress: '进行中',
      inProgressSubtitle: '当前活跃',
      planned: '计划中',
      plannedSubtitle: '尚未开始',
    },
  },
};
