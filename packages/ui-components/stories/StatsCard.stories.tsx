import type { Meta, StoryObj } from '@storybook/react';
import { FileText, CheckCircle2, PlayCircle, Clock } from 'lucide-react';
import { StatsCard } from '../src/components/stats/stats-card';

const meta: Meta<typeof StatsCard> = {
  title: 'Stats/StatsCard',
  component: StatsCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[250px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Total Specs',
    value: 42,
    subtitle: 'All specifications',
    icon: FileText,
    iconColorClass: 'text-blue-600',
    gradientClass: 'from-blue-500/10',
  },
};

export const WithTrendUp: Story = {
  args: {
    title: 'Completed',
    value: 28,
    subtitle: '67% completion rate',
    icon: CheckCircle2,
    iconColorClass: 'text-green-600',
    gradientClass: 'from-green-500/10',
    trend: 'up',
    trendValue: '+12%',
  },
};

export const WithTrendDown: Story = {
  args: {
    title: 'In Progress',
    value: 8,
    icon: PlayCircle,
    iconColorClass: 'text-orange-600',
    gradientClass: 'from-orange-500/10',
    trend: 'down',
    trendValue: '-3',
  },
};

export const Planned: Story = {
  args: {
    title: 'Planned',
    value: 6,
    subtitle: 'Not yet started',
    icon: Clock,
    iconColorClass: 'text-blue-600',
    gradientClass: 'from-blue-500/10',
  },
};

export const StringValue: Story = {
  args: {
    title: 'Status',
    value: 'On Track',
    subtitle: 'Project is progressing well',
    icon: CheckCircle2,
    iconColorClass: 'text-green-600',
    gradientClass: 'from-green-500/10',
  },
};

export const Grid: Story = {
  decorators: [
    () => (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-[800px]">
        <StatsCard
          title="Total Specs"
          value={42}
          subtitle="All specifications"
          icon={FileText}
          iconColorClass="text-blue-600"
          gradientClass="from-blue-500/10"
        />
        <StatsCard
          title="Completed"
          value={28}
          subtitle="67% completion rate"
          icon={CheckCircle2}
          iconColorClass="text-green-600"
          gradientClass="from-green-500/10"
        />
        <StatsCard
          title="In Progress"
          value={8}
          subtitle="Currently active"
          icon={PlayCircle}
          iconColorClass="text-orange-600"
          gradientClass="from-orange-500/10"
        />
        <StatsCard
          title="Planned"
          value={6}
          subtitle="Not yet started"
          icon={Clock}
          iconColorClass="text-blue-600"
          gradientClass="from-blue-500/10"
        />
      </div>
    ),
  ],
};
