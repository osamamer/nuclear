import { ArrowRight, Settings2, Sparkles, X } from 'lucide-react';
import { FC, FormEvent, useEffect } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, Loader } from '@nuclearplayer/ui';

import type { TasteProfile } from '../../../services/discover/tasteProfile';
import { useDiscoverStore } from '../../../stores/discoverStore';
import { useSettingsModalStore } from '../../../stores/settingsModalStore';
import { useAiBackend, useAiCurator } from '../hooks/useDiscover';
import { TrackDeck } from './TrackDeck';

const VIBES = [
  'lateNight',
  'focus',
  'workout',
  'deepCuts',
  'roadTrip',
  'rainyDay',
] as const;

const BACKEND_LABELS: Record<string, string> = {
  claudeCli: 'Claude Code',
  codexCli: 'Codex',
  anthropicApi: 'Claude API',
};

export const AiCurator: FC<{ profile: TasteProfile | undefined }> = ({
  profile,
}) => {
  const { t } = useTranslation('discovery');
  const request = useDiscoverStore((state) => state.aiRequest);
  const setRequest = useDiscoverStore((state) => state.setAiRequest);
  const result = useDiscoverStore((state) => state.aiResult);
  const setResult = useDiscoverStore((state) => state.setAiResult);
  const { data: backend, isLoading: isDetecting } = useAiBackend();
  const curator = useAiCurator(profile);
  const isAvailable = Boolean(backend);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !isAvailable || curator.isPending) {
      return;
    }
    setRequest(trimmed);
    curator.mutate(trimmed);
  };

  const pendingAiRequest = useDiscoverStore((state) => state.pendingAiRequest);
  useEffect(() => {
    if (!backend || !pendingAiRequest) {
      return;
    }
    const pending = useDiscoverStore.getState().takePendingAiRequest();
    if (pending) {
      curator.mutate(pending);
    }
  }, [backend, pendingAiRequest, curator]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(request);
  };

  return (
    <>
      <section
        data-testid="discover-ai"
        className="border-border bg-primary/10 shadow-shadow relative mb-8 w-full overflow-hidden rounded-3xl border-(length:--border-width) p-5 sm:p-7"
      >
        <div className="bg-primary/25 pointer-events-none absolute -top-16 -right-16 size-56 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-primary mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase">
            <Sparkles size={14} />
            {t('ai.eyebrow')}
            {backend && (
              <span
                data-testid="discover-ai-backend"
                className="border-primary/40 text-foreground/70 rounded-full border px-2 py-0.5 text-[10px] tracking-normal normal-case"
              >
                {t('ai.poweredBy', { name: BACKEND_LABELS[backend] })}
              </span>
            )}
          </p>
          <h2 className="text-foreground mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('ai.title')}
          </h2>
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              data-testid="discover-ai-input"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              disabled={!isAvailable}
              placeholder={t('ai.placeholder')}
              className="border-border bg-background text-foreground placeholder:text-foreground/40 focus:ring-primary h-12 min-w-0 flex-1 rounded-xl border-(length:--border-width) px-4 text-base outline-none focus:ring-2 disabled:opacity-60"
            />
            <Button
              type="submit"
              data-testid="discover-ai-submit"
              className="h-12 px-5"
              disabled={!isAvailable || curator.isPending || !request.trim()}
            >
              {curator.isPending ? (
                <Loader size="sm" />
              ) : (
                <ArrowRight size={18} />
              )}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {VIBES.map((vibe) => (
              <button
                key={vibe}
                type="button"
                data-testid="discover-vibe"
                disabled={!isAvailable || curator.isPending}
                onClick={() => ask(t(`ai.vibes.${vibe}.prompt`))}
                className="border-border/70 bg-background/70 text-foreground hover:border-primary hover:bg-background cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t(`ai.vibes.${vibe}.label`)}
              </button>
            ))}
          </div>
          {!isAvailable && !isDetecting && (
            <div
              data-testid="discover-ai-setup"
              className="text-foreground/70 mt-4 flex flex-wrap items-center gap-3 text-sm"
            >
              {t('ai.setupHint')}
              <Button
                size="xs"
                variant="ghost"
                onClick={() =>
                  useSettingsModalStore.getState().open('integrations')
                }
              >
                <Settings2 size={14} className="mr-1" />
                {t('ai.setupAction')}
              </Button>
            </div>
          )}
          {curator.isPending && (
            <p
              data-testid="discover-ai-thinking"
              className="text-foreground/70 mt-4 text-sm"
            >
              {t('ai.thinking')}
            </p>
          )}
          {curator.isError && (
            <p
              data-testid="discover-ai-error"
              className="text-accent-red mt-4 text-sm"
            >
              {t('ai.error', { message: curator.error.message })}
            </p>
          )}
        </div>
      </section>
      {result && (
        <TrackDeck
          data-testid="discover-ai-results"
          eyebrow={t('ai.resultsEyebrow')}
          title={result.headline}
          entries={result.tracks.map((entry, index) => ({
            id: `ai-${index}-${entry.track.source.id}`,
            track: entry.track,
            note: entry.reason,
          }))}
          actions={
            <Button
              size="sm"
              variant="text"
              data-testid="discover-ai-clear"
              onClick={() => setResult(null)}
            >
              <X size={16} className="mr-1" />
              {t('ai.clear')}
            </Button>
          }
        />
      )}
    </>
  );
};
