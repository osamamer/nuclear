import { Meta, StoryObj } from '@storybook/react-vite';

import { MovingEqualizer } from '@nuclearplayer/ui';

const meta = {
  title: 'Components/MovingEqualizer',
  component: MovingEqualizer,
  tags: ['autodocs'],
  args: {
    className: 'text-accent-green',
  },
} satisfies Meta<typeof MovingEqualizer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Small: Story = {};

export const Medium: Story = {
  args: { size: 'md' },
};
