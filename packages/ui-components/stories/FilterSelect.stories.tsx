import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Clock, PlayCircle, CheckCircle2, Archive } from 'lucide-react';
import { FilterSelect, type FilterOption } from '../src/components/search/filter-select';

const meta: Meta<typeof FilterSelect> = {
  title: 'Search/FilterSelect',
  component: FilterSelect,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[200px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const statusOptions: FilterOption[] = [
  { value: 'planned', label: 'Planned', icon: <Clock className="h-4 w-4" /> },
  { value: 'in-progress', label: 'In Progress', icon: <PlayCircle className="h-4 w-4" /> },
  { value: 'complete', label: 'Complete', icon: <CheckCircle2 className="h-4 w-4" /> },
  { value: 'archived', label: 'Archived', icon: <Archive className="h-4 w-4" /> },
];

const priorityOptions: FilterOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const Default: Story = {
  args: {
    options: statusOptions,
    placeholder: 'Select status...',
  },
};

export const WithValue: Story = {
  args: {
    options: statusOptions,
    value: 'in-progress',
    placeholder: 'Select status...',
  },
};

export const WithoutIcons: Story = {
  args: {
    options: priorityOptions,
    placeholder: 'Select priority...',
  },
};

export const NotClearable: Story = {
  args: {
    options: priorityOptions,
    clearable: false,
    placeholder: 'Select priority...',
  },
};

export const Interactive: Story = {
  render: function InteractiveFilterSelect() {
    const [value, setValue] = useState<string>('');

    return (
      <div className="space-y-4">
        <FilterSelect
          options={statusOptions}
          value={value}
          onChange={setValue}
          placeholder="Filter by status..."
          clearLabel="All statuses"
        />
        <p className="text-sm text-muted-foreground">
          Selected: <strong>{value || 'none'}</strong>
        </p>
      </div>
    );
  },
};
