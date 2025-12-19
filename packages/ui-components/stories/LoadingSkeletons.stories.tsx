import type { Meta, StoryObj } from '@storybook/react';
import {
  SpecListSkeleton,
  SpecDetailSkeleton,
  StatsCardSkeleton,
  KanbanBoardSkeleton,
  ProjectCardSkeleton,
  SidebarSkeleton,
  ContentSkeleton,
} from '../src/components/layout/loading-skeletons';

const meta: Meta = {
  title: 'Layout/Loading Skeletons',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

export const SpecList: StoryObj = {
  render: () => <SpecListSkeleton />,
};

export const SpecDetail: StoryObj = {
  render: () => <SpecDetailSkeleton />,
};

export const StatsCard: StoryObj = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  ),
};

export const KanbanBoard: StoryObj = {
  render: () => <KanbanBoardSkeleton />,
};

export const ProjectCard: StoryObj = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ProjectCardSkeleton />
      <ProjectCardSkeleton />
      <ProjectCardSkeleton />
    </div>
  ),
};

export const Sidebar: StoryObj = {
  render: () => (
    <div className="w-64 border rounded-lg">
      <SidebarSkeleton />
    </div>
  ),
};

export const Content: StoryObj = {
  render: () => (
    <div className="space-y-6">
      <ContentSkeleton lines={3} />
      <ContentSkeleton lines={5} />
      <ContentSkeleton lines={2} />
    </div>
  ),
};
