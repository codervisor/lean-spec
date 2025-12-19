import type { Meta, StoryObj } from '@storybook/react';
import { ProjectSwitcher } from '../src/components/project/project-switcher';
import type { Project } from '../src/components/project/project-switcher';

const meta = {
  title: 'Project/ProjectSwitcher',
  component: ProjectSwitcher,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockProjects: Project[] = [
  { id: '1', name: 'LeanSpec', favorite: true, color: '#3b82f6' },
  { id: '2', name: 'My Project', favorite: false },
  { id: '3', name: 'Another Project', favorite: false, color: '#10b981' },
  { id: '4', name: 'Test Project', favorite: true, color: '#f59e0b' },
];

export const Default: Story = {
  args: {
    currentProject: mockProjects[0],
    projects: mockProjects,
    onProjectSelect: (projectId) => console.log('Selected project:', projectId),
    onAddProject: () => console.log('Add project clicked'),
    onManageProjects: () => console.log('Manage projects clicked'),
  },
  render: (args) => (
    <div style={{ width: '250px' }}>
      <ProjectSwitcher {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isLoading: true,
  },
  render: (args) => (
    <div style={{ width: '250px' }}>
      <ProjectSwitcher {...args} />
    </div>
  ),
};

export const Switching: Story = {
  args: {
    ...Default.args,
    isSwitching: true,
  },
  render: (args) => (
    <div style={{ width: '250px' }}>
      <ProjectSwitcher {...args} />
    </div>
  ),
};

export const Collapsed: Story = {
  args: {
    ...Default.args,
    collapsed: true,
  },
  render: (args) => (
    <div style={{ width: '60px' }}>
      <ProjectSwitcher {...args} />
    </div>
  ),
};

export const CustomLabels: Story = {
  args: {
    ...Default.args,
    labels: {
      switching: 'Changing...',
      placeholder: 'Choose a project',
      searchPlaceholder: 'Find project...',
      noProject: 'No projects available',
      projects: 'All Projects',
      createProject: 'New Project',
      manageProjects: 'Settings',
    },
  },
  render: (args) => (
    <div style={{ width: '250px' }}>
      <ProjectSwitcher {...args} />
    </div>
  ),
};
