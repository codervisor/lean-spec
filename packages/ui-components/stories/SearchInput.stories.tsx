import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SearchInput } from '../src/components/search/search-input';

const meta: Meta<typeof SearchInput> = {
  title: 'Search/SearchInput',
  component: SearchInput,
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
    placeholder: 'Search specs...',
  },
};

export const WithValue: Story = {
  args: {
    value: 'ui components',
    placeholder: 'Search specs...',
  },
};

export const WithoutShortcut: Story = {
  args: {
    showShortcut: false,
    placeholder: 'Type to search...',
  },
};

export const CustomShortcut: Story = {
  args: {
    showShortcut: true,
    shortcutKey: 'P',
    placeholder: 'Search projects...',
  },
};

export const NotClearable: Story = {
  args: {
    value: 'some search',
    clearable: false,
    placeholder: 'Search...',
  },
};

export const Interactive: Story = {
  render: function InteractiveSearchInput() {
    const [value, setValue] = useState('');
    const [lastSearch, setLastSearch] = useState('');

    return (
      <div className="space-y-4">
        <SearchInput
          value={value}
          onChange={setValue}
          onSearch={setLastSearch}
          placeholder="Search and press Enter..."
        />
        {lastSearch && (
          <p className="text-sm text-muted-foreground">
            Last search: <strong>{lastSearch}</strong>
          </p>
        )}
      </div>
    );
  },
};
