import find from 'lodash-es/find';
import head from 'lodash-es/head';
import { FC, useRef, useState } from 'react';

import type { QueueItem } from '@nuclearplayer/model';
import { ScrollableArea } from '@nuclearplayer/ui';

import { useCoreSetting } from '../../../hooks/useCoreSetting';
import { useLyricsOffset } from '../../../hooks/useLyricsOffset';
import { useProviders } from '../../../hooks/useProviders';
import { useLyrics } from '../hooks/useLyrics';
import { LyricsContent } from './LyricsContent';
import { LyricsToolbar } from './LyricsToolbar';

const LYRICS_TEXT_SIZES = [
  'text-4xl/[1.45]',
  'text-5xl/[1.45]',
  'text-6xl/[1.45]',
];

type LyricsForTrackProps = {
  currentItem: QueueItem | undefined;
};

export const LyricsForTrack: FC<LyricsForTrackProps> = ({ currentItem }) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const providers = useProviders('lyrics');
  const { data: results = [], isLoading } = useLyrics(currentItem, providers);
  const [selectedProviderId, setSelectedProviderId] = useState<string>();
  const selectedResult =
    find(results, { providerId: selectedProviderId }) ?? head(results);
  const [textSize] = useCoreSetting<number>('lyrics.textSize');
  const { offsetMs, showEarlier, showLater } = useLyricsOffset();

  return (
    <>
      <LyricsToolbar
        results={results}
        selectedResult={selectedResult}
        onSelectProvider={setSelectedProviderId}
        offsetMs={offsetMs}
        onShowEarlier={showEarlier}
        onShowLater={showLater}
      />
      <ScrollableArea
        data-testid="lyrics-scroll-area"
        viewportRef={viewportRef}
        className="min-h-0 flex-1"
        viewportClassName="scroll-smooth mask-y-from-95% px-6 py-10 sm:px-[max(2.5rem,calc((100%_-_56rem)/2))]"
      >
        <LyricsContent
          currentItem={currentItem}
          providers={providers}
          isLoading={isLoading}
          result={selectedResult}
          offsetMs={offsetMs}
          viewportRef={viewportRef}
          textSizeClass={
            LYRICS_TEXT_SIZES[textSize ?? 1] ?? LYRICS_TEXT_SIZES[1]
          }
        />
      </ScrollableArea>
    </>
  );
};
