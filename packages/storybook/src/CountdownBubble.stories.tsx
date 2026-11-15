import { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';

import { CountdownBubble } from '@nuclearplayer/ui';

const meta = {
  title: 'Components/CountdownBubble',
  component: CountdownBubble,
  tags: ['autodocs'],
  args: {
    remainingMs: 3200,
    durationMs: 5000,
    label: 'Skip unlocks in 4 seconds',
  },
} satisfies Meta<typeof CountdownBubble>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Counting: Story = {};

export const Ready: Story = {
  args: { remainingMs: 0, label: 'Skip allowed' },
};

const LiveCountdown = ({ durationMs }: { durationMs: number }) => {
  const [deadline, setDeadline] = useState(() => Date.now() + durationMs);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(intervalId);
  }, []);

  const remainingMs = Math.max(deadline - now, 0);

  return (
    <div className="flex flex-col items-start gap-4 p-8">
      <CountdownBubble
        remainingMs={remainingMs}
        durationMs={durationMs}
        label="Countdown"
      />
      <button
        className="text-foreground underline"
        onClick={() => setDeadline(Date.now() + durationMs)}
      >
        Restart
      </button>
    </div>
  );
};

export const Live: Story = {
  render: () => <LiveCountdown durationMs={5000} />,
};

export const FastForwardWait: Story = {
  render: () => <LiveCountdown durationMs={10000} />,
};
