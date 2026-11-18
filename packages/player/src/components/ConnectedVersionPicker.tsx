import { useQuery } from '@tanstack/react-query';
import { Check, Disc3 } from 'lucide-react';
import { FC, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { StreamCandidate, Track } from '@nuclearplayer/model';
import {
  Button,
  cn,
  Dialog,
  FilterChips,
  formatTimeMillis,
  Loader,
  Toggle,
} from '@nuclearplayer/ui';

import { keyOfTrack } from '../services/discover/trackKeys';
import {
  applyVersion,
  findVersions,
  preferredVersionId,
  VERSION_VARIANTS,
  VersionVariant,
} from '../services/versions/trackVersions';
import { useVersionPickerStore } from '../stores/versionPickerStore';

type VersionListProps = {
  track: Track;
  variant: VersionVariant;
  selectedId: string | undefined;
  onSelect: (candidate: StreamCandidate) => void;
};

const VersionList: FC<VersionListProps> = ({
  track,
  variant,
  selectedId,
  onSelect,
}) => {
  const { t } = useTranslation('track');
  const preferredId = preferredVersionId(track);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['track-versions', keyOfTrack(track), variant],
    queryFn: () => findVersions(track, variant),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div
        data-testid="version-picker-loading"
        className="flex justify-center py-10"
      >
        <Loader />
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    return (
      <p
        data-testid="version-picker-empty"
        className="text-foreground/60 py-10 text-center text-sm"
      >
        {t('versions.none')}
      </p>
    );
  }

  return (
    <ul
      data-testid="version-picker-list"
      className="flex max-h-[45vh] flex-col gap-1.5 overflow-y-auto pr-1"
    >
      {data.map((candidate) => {
        const isSelected = candidate.id === selectedId;
        return (
          <li key={candidate.id}>
            <button
              type="button"
              data-testid="version-option"
              aria-pressed={isSelected}
              onClick={() => onSelect(candidate)}
              className={cn(
                'border-border/60 hover:border-primary/60 hover:bg-primary/5 flex w-full cursor-pointer items-center gap-3 rounded-xl border p-2 text-left transition-colors',
                isSelected && 'border-primary bg-primary/10',
              )}
            >
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                {candidate.thumbnail ? (
                  <img
                    src={candidate.thumbnail}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <Disc3 size={20} className="text-foreground/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm font-semibold">
                  {candidate.title}
                </span>
                <span className="text-foreground/55 flex items-center gap-2 text-xs">
                  {candidate.durationMs !== undefined &&
                    formatTimeMillis(candidate.durationMs)}
                  {candidate.id === preferredId && (
                    <span
                      data-testid="version-preferred-badge"
                      className="text-primary font-semibold"
                    >
                      {t('versions.yourPick')}
                    </span>
                  )}
                </span>
              </div>
              {isSelected && (
                <Check size={18} className="text-primary mr-1 shrink-0" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const VersionPickerBody: FC<{ track: Track; onClose: () => void }> = ({
  track,
  onClose,
}) => {
  const { t } = useTranslation('track');
  const [variant, setVariant] = useState<VersionVariant>('original');
  const [selected, setSelected] = useState<StreamCandidate | null>(null);
  const [remember, setRemember] = useState(true);
  const artistNames = track.artists.map((artist) => artist.name).join(', ');

  const confirm = async () => {
    if (!selected) {
      return;
    }
    onClose();
    await applyVersion(track, selected, remember);
  };

  return (
    <div data-testid="version-picker" className="flex flex-col gap-4">
      <div>
        <Dialog.Title>{t('versions.title')}</Dialog.Title>
        <p className="text-foreground/60 mt-1 truncate text-sm">
          {track.title} · {artistNames}
        </p>
      </div>
      <FilterChips
        data-testid="version-variants"
        items={VERSION_VARIANTS.map((id) => ({
          id,
          label: t(`versions.variants.${id}`),
        }))}
        selected={variant}
        onChange={(id) => {
          setVariant(id as VersionVariant);
          setSelected(null);
        }}
      />
      <VersionList
        track={track}
        variant={variant}
        selectedId={selected?.id}
        onSelect={setSelected}
      />
      <label className="text-foreground/80 flex items-center gap-3 text-sm">
        <Toggle
          data-testid="version-remember-toggle"
          checked={remember}
          onChange={setRemember}
          label={t('versions.remember')}
        />
        {t('versions.remember')}
      </label>
      <Dialog.Actions>
        <Button variant="text" onClick={onClose}>
          {t('versions.cancel')}
        </Button>
        <Button
          data-testid="version-play-button"
          disabled={!selected}
          onClick={confirm}
        >
          {t('versions.play')}
        </Button>
      </Dialog.Actions>
    </div>
  );
};

export const ConnectedVersionPicker: FC = () => {
  const track = useVersionPickerStore((state) => state.track);
  const close = useVersionPickerStore((state) => state.close);

  return (
    <Dialog.Root isOpen={track !== null} onClose={close} className="max-w-xl">
      {track && <VersionPickerBody track={track} onClose={close} />}
    </Dialog.Root>
  );
};
