import { Volume2, VolumeX } from 'lucide-react';
import { FC } from 'react';

import { Button, Slider } from '..';
import { cn } from '../../utils';

type PlayerBarVolumeProps = {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  muteLabel?: string;
  unmuteLabel?: string;
  disabled?: boolean;
  className?: string;
};

export const PlayerBarVolume: FC<PlayerBarVolumeProps> = ({
  value,
  defaultValue,
  onValueChange,
  muted = false,
  onMutedChange,
  muteLabel,
  unmuteLabel,
  disabled,
  className = '',
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        size="icon-sm"
        variant="text"
        className="text-primary size-6 p-0"
        disabled={disabled}
        aria-label={muted ? unmuteLabel : muteLabel}
        aria-pressed={muted}
        onClick={() => onMutedChange?.(!muted)}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </Button>
      <div className="w-24" data-testid="player-volume-slider">
        <Slider
          size="sm"
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          disabled={disabled}
          showValue={false}
          showFooter={false}
        />
      </div>
    </div>
  );
};
