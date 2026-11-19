import { useQuery } from '@tanstack/react-query';
import { Check, Disc3, Play, Square } from 'lucide-react';
import { FC, useState } from 'react';

import { Sound } from '@nuclearplayer/hifi';
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

import { useCoreSetting } from '../hooks/useCoreSetting';
import { useVersionPreview } from '../hooks/useVersionPreview';
import { keyOfTrack } from '../services/discover/trackKeys';
import { getLocalStreamId } from '../services/streamVerification';
import {
  applyVersion,
  findVersions,
  VERSION_VARIANTS,
  VersionVariant,
} from '../services/versions/trackVersions';
import { useVersionPickerStore } from '../stores/versionPickerStore';

type VersionPreview = ReturnType<typeof useVersionPreview>;

type PreviewButtonProps = {
  candidate: StreamCandidate;
  preview: VersionPreview;
};

const PreviewButton: FC<PreviewButtonProps> = ({ candidate, preview }) => {
  const { t } = useTranslation('track');
  const isActive = preview.candidateId === candidate.id;
  const isLoading = isActive && preview.isLoading;
  const hasFailed = preview.failedIds.includes(candidate.id);
  const label = hasFailed
    ? t('versions.previewFailed')
    : isActive
      ? t('versions.stopPreview')
      : t('versions.preview');

  return (
    <button
      type="button"
      data-testid="version-preview-button"
      aria-label={label}
      title={label}
      aria-pressed={isActive}
      onClick={() => preview.toggle(candidate)}
      className="group/preview bg-muted relative flex size-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg"
    >
      {candidate.thumbnail ? (
        <img
          src={candidate.thumbnail}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <Disc3 size={20} className="text-foreground/40" />
      )}
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover/preview:opacity-100',
          (isActive || hasFailed) && 'opacity-100',
          hasFailed && 'bg-accent-red/60',
        )}
      >
        {isLoading ? (
          <Loader size="sm" />
        ) : isActive ? (
          <Square size={16} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" />
        )}
      </span>
    </button>
  );
};

type VersionListProps = {
  track: Track;
  variant: VersionVariant;
  selectedId: string | undefined;
  onSelect: (candidate: StreamCandidate) => void;
  preview: VersionPreview;
};

const VersionList: FC<VersionListProps> = ({
  track,
  variant,
  selectedId,
  onSelect,
  preview,
}) => {
  const { t } = useTranslation('track');
  const preferredId = getLocalStreamId(track);
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
        const isPreviewing =
          preview.candidateId === candidate.id && !preview.isLoading;
        const progress =
          isPreviewing && preview.duration > 0
            ? (preview.position / preview.duration) * 100
            : 0;
        return (
          <li
            key={candidate.id}
            className={cn(
              'border-border/60 hover:border-primary/60 hover:bg-primary/5 relative flex items-center gap-3 overflow-hidden rounded-xl border p-2 transition-colors',
              isSelected && 'border-primary bg-primary/10',
            )}
          >
            <PreviewButton candidate={candidate} preview={preview} />
            <button
              type="button"
              data-testid="version-option"
              aria-pressed={isSelected}
              onClick={() => onSelect(candidate)}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 self-stretch text-left"
            >
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
            {isPreviewing && (
              <span
                data-testid="version-preview-progress"
                className="bg-primary absolute bottom-0 left-0 h-0.5 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};

const VersionPickerBody: FC<{
  track: Track;
  playlistId?: string;
  onClose: () => void;
}> = ({ track, playlistId, onClose }) => {
  const { t } = useTranslation('track');
  const [variant, setVariant] = useState<VersionVariant>('original');
  const [selected, setSelected] = useState<StreamCandidate | null>(null);
  const [remember, setRemember] = useState(true);
  const preview = useVersionPreview();
  const [volume] = useCoreSetting<number>('playback.volume');
  const artistNames = track.artists.map((artist) => artist.name).join(', ');

  const confirm = async () => {
    if (!selected) {
      return;
    }
    preview.keepMainPaused();
    preview.stop();
    onClose();
    await applyVersion(
      track,
      preview.resolvedCandidate(selected),
      remember,
      playlistId,
    );
  };

  return (
    <div data-testid="version-picker" className="flex flex-col gap-4">
      <div>
        <Dialog.Title>{t('versions.title')}</Dialog.Title>
        <p className="text-foreground/60 mt-1 truncate text-sm">
          {track.title} · {artistNames}
        </p>
        <p className="text-foreground/45 mt-1 text-xs">{t('versions.hint')}</p>
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
          preview.stop();
        }}
      />
      <VersionList
        track={track}
        variant={variant}
        selectedId={selected?.id}
        onSelect={(candidate) => {
          setSelected(candidate);
          void preview.start(candidate);
        }}
        preview={preview}
      />
      {preview.source && (
        <Sound
          src={preview.source}
          status="playing"
          volume={Math.round((volume ?? 1) * 100)}
          onTimeUpdate={preview.updateProgress}
          onEnd={preview.stop}
          onError={preview.failCurrent}
        />
      )}
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
  const playlistId = useVersionPickerStore((state) => state.playlistId);
  const close = useVersionPickerStore((state) => state.close);

  return (
    <Dialog.Root isOpen={track !== null} onClose={close} className="max-w-xl">
      {track && (
        <VersionPickerBody
          track={track}
          playlistId={playlistId}
          onClose={close}
        />
      )}
    </Dialog.Root>
  );
};
