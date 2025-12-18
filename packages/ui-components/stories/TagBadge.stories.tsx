import type { Meta, StoryObj } from '@storybook/react';
import { TagBadge, TagList } from '../src/components/spec/tag-badge';

const meta: Meta<typeof TagBadge> = {
  title: 'Spec/TagBadge',
  component: TagBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tag: 'feature',
  },
};

export const WithIcon: Story = {
  args: {
    tag: 'feature',
    showIcon: true,
  },
};

export const Clickable: Story = {
  args: {
    tag: 'ui',
    onClick: () => console.log('Tag clicked'),
  },
};

export const Removable: Story = {
  args: {
    tag: 'removable',
    removable: true,
    onRemove: () => console.log('Remove clicked'),
  },
};

export const TagListComponent: StoryObj<typeof TagList> = {
  render: () => (
    <TagList
      tags={['ui', 'components', 'react', 'typescript', 'vite']}
      onTagClick={(tag) => console.log('Clicked:', tag)}
    />
  ),
};

export const TagListTruncated: StoryObj<typeof TagList> = {
  render: () => (
    <TagList
      tags={['ui', 'components', 'react', 'typescript', 'vite', 'storybook', 'testing', 'more']}
      maxVisible={3}
    />
  ),
};
