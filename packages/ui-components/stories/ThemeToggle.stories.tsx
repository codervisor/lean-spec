import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle, useTheme } from '../src/components/navigation/theme-toggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Navigation/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {
  args: {
    theme: 'light',
    onThemeChange: (theme) => console.log('Theme changed:', theme),
  },
};

export const Dark: Story = {
  args: {
    theme: 'dark',
    onThemeChange: (theme) => console.log('Theme changed:', theme),
  },
};

export const Interactive: Story = {
  render: function InteractiveThemeToggle() {
    const { theme, setTheme } = useTheme('light');
    return (
      <div className="flex items-center gap-4">
        <ThemeToggle theme={theme} onThemeChange={setTheme} />
        <span className="text-sm">Current theme: {theme}</span>
      </div>
    );
  },
};
