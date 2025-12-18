import type { Meta, StoryObj } from '@storybook/react';
import { SpecMetadata } from '../src/components/spec/spec-metadata';

const meta: Meta<typeof SpecMetadata> = {
  title: 'Spec/SpecMetadata',
  component: SpecMetadata,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleSpec = {
  status: 'in-progress',
  priority: 'high',
  createdAt: '2025-12-01T10:00:00Z',
  updatedAt: new Date().toISOString(),
  assignee: 'John Doe',
  tags: ['ui', 'components', 'architecture'],
  githubUrl: 'https://github.com/example/repo',
};

export const Default: Story = {
  args: {
    spec: sampleSpec,
  },
};

export const Minimal: Story = {
  args: {
    spec: {
      status: 'planned',
      priority: 'medium',
    },
  },
};

export const Complete: Story = {
  args: {
    spec: {
      ...sampleSpec,
      status: 'complete',
      completedAt: '2025-12-15T14:30:00Z',
    },
  },
};

export const NoAssignee: Story = {
  args: {
    spec: {
      status: 'in-progress',
      priority: 'high',
      createdAt: '2025-12-01T10:00:00Z',
      updatedAt: new Date().toISOString(),
      tags: ['feature', 'api'],
    },
  },
};

export const WithGitHub: Story = {
  args: {
    spec: {
      status: 'in-progress',
      priority: 'critical',
      createdAt: '2025-12-10T08:00:00Z',
      updatedAt: new Date().toISOString(),
      githubUrl: 'https://github.com/codervisor/lean-spec/tree/main/specs/185-ui-components',
    },
  },
};

export const CustomLabels: Story = {
  args: {
    spec: sampleSpec,
    labels: {
      status: '状态',
      priority: '优先级',
      created: '创建时间',
      updated: '更新时间',
      assignee: '负责人',
      tags: '标签',
      source: '来源',
      viewOnGitHub: '在 GitHub 查看',
    },
    locale: 'zh-CN',
  },
};
