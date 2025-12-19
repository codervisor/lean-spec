import type { Meta, StoryObj } from '@storybook/react';
import { BackToTop } from '../src/components/navigation/back-to-top';

const meta: Meta<typeof BackToTop> = {
  title: 'Navigation/BackToTop',
  component: BackToTop,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: '200vh', padding: '2rem' }}>
        <p>Scroll down to see the back to top button</p>
        <div style={{ height: '500px' }} />
        <p>Keep scrolling...</p>
        <div style={{ height: '500px' }} />
        <p>Almost there...</p>
        <Story />
      </div>
    ),
  ],
  args: {
    threshold: 300,
  },
};

export const CustomPosition: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: '200vh', padding: '2rem' }}>
        <p>Scroll down to see the back to top button at custom position</p>
        <div style={{ height: '1000px' }} />
        <Story />
      </div>
    ),
  ],
  args: {
    threshold: 200,
    bottom: 48,
    right: 48,
  },
};
