import type { Meta, StoryObj } from '@storybook/react';
import { FileText, Package, FolderOpen } from 'lucide-react';
import { EmptyState } from '../src/components/layout/empty-state';

const meta: Meta<typeof EmptyState> = {
  title: 'Layout/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSpecs: Story = {
  args: {
    icon: FileText,
    title: 'No specs found',
    description: 'Create your first spec to get started with LeanSpec.',
    action: {
      label: 'Create Spec',
      onClick: () => console.log('Create spec clicked'),
    },
  },
};

export const NoProjects: Story = {
  args: {
    icon: FolderOpen,
    title: 'No projects',
    description: 'Add a project to start managing your specifications.',
    action: {
      label: 'Add Project',
      onClick: () => console.log('Add project clicked'),
    },
  },
};

export const NoResults: Story = {
  args: {
    icon: Package,
    title: 'No results',
    description: 'Try adjusting your search or filter criteria.',
  },
};

export const WithLink: Story = {
  args: {
    icon: FileText,
    title: 'Learn More',
    description: 'Visit our documentation to learn how to use LeanSpec.',
    action: {
      label: 'View Documentation',
      href: 'https://lean-spec.dev/docs',
    },
  },
};
