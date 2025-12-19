import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ProjectDialog } from '../src/components/project/project-dialog';
import { Button } from '../src/components/ui/button';

const meta = {
  title: 'Project/ProjectDialog',
  component: ProjectDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: (open) => console.log('Open changed:', open),
    onSubmit: async (path) => {
      console.log('Submitted path:', path);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
};

export const WithBrowse: Story = {
  args: {
    ...Default.args,
    onBrowseFolder: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return '/Users/username/projects/my-project';
    },
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isLoading: true,
  },
};

export const Interactive: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (path: string) => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Submitted:', path);
      setIsLoading(false);
      setOpen(false);
    };

    const handleBrowse = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return '/Users/username/projects/selected-project';
    };

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <ProjectDialog
          open={open}
          onOpenChange={setOpen}
          onSubmit={handleSubmit}
          onBrowseFolder={handleBrowse}
          isLoading={isLoading}
        />
      </div>
    );
  },
};

export const CustomLabels: Story = {
  args: {
    ...Default.args,
    labels: {
      title: 'Add New Project',
      descriptionPicker: 'Choose a folder from your file system',
      descriptionManual: 'Type the path to your project folder',
      pathLabel: 'Folder Path',
      pathPlaceholder: 'e.g., /Users/me/my-project',
      pathHelp: 'The folder should contain your project files',
      action: 'Create',
      adding: 'Creating...',
      cancel: 'Abort',
      browseFolders: 'Choose Folder',
      enterManually: 'Type path instead',
    },
  },
};
