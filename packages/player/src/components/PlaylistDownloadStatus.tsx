import { Download } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Popover } from '@nuclearplayer/ui';

import { usePlaylistDownloadProgressStore } from '../stores/playlistDownloadProgressStore';

export const PlaylistDownloadStatus: FC = () => {
  const { t } = useTranslation('playlists');
  const activeDownloads = usePlaylistDownloadProgressStore(
    (state) => state.activeDownloads,
  );
  const queuedDownloads = usePlaylistDownloadProgressStore(
    (state) => state.queuedDownloads,
  );
  const completedCount = usePlaylistDownloadProgressStore(
    (state) => state.completedCount,
  );
  const failedCount = usePlaylistDownloadProgressStore(
    (state) => state.failedCount,
  );
  const isScanning = usePlaylistDownloadProgressStore(
    (state) => state.isScanning,
  );
  const pendingCount = activeDownloads.length + queuedDownloads.length;

  return (
    <Popover
      trigger={
        <span
          className="text-foreground/70 hover:bg-foreground/10 relative flex size-8 items-center justify-center rounded-full transition-colors"
          data-testid="playlist-downloads-button"
          title={t('downloads.button')}
        >
          <Download aria-hidden="true" size={17} />
          <span className="sr-only">{t('downloads.button')}</span>
          {pendingCount > 0 && (
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-bold"
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </span>
      }
      anchor="bottom"
      className="relative flex items-center"
      panelClassName="w-80 max-w-[calc(100vw-2rem)] p-4"
    >
      <div
        className="flex flex-col gap-4"
        data-testid="playlist-downloads-panel"
      >
        <h2 className="text-foreground text-sm font-bold">
          {t('downloads.title')}
        </h2>

        {isScanning && (
          <p className="text-foreground/65 text-xs">
            {t('downloads.scanning')}
          </p>
        )}

        {activeDownloads.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-foreground/65 text-xs font-bold tracking-wide uppercase">
              {t('downloads.downloading')}
            </h3>
            {activeDownloads.map((task) => (
              <div key={task.key} className="flex flex-col gap-1.5">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="text-foreground min-w-0 truncate text-xs">
                    {task.title}
                  </span>
                  <span className="text-foreground/60 shrink-0 text-[11px]">
                    {task.progress === undefined
                      ? t('downloads.preparing')
                      : `${task.progress}%`}
                  </span>
                </div>
                <div
                  aria-label={task.title}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={task.progress}
                  className="bg-muted h-1.5 overflow-hidden rounded-full"
                  role="progressbar"
                >
                  <div
                    className="bg-primary h-full rounded-full transition-[width] duration-200"
                    style={{
                      width:
                        task.progress === undefined
                          ? '35%'
                          : `${task.progress}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </section>
        )}

        {queuedDownloads.length > 0 && (
          <section className="flex flex-col gap-2">
            {activeDownloads.length === 0 && (
              <p className="text-foreground/60 text-xs">
                {t('downloads.waiting')}
              </p>
            )}
            <h3 className="text-foreground/65 text-xs font-bold tracking-wide uppercase">
              {t('downloads.queued', { count: queuedDownloads.length })}
            </h3>
            <div className="text-foreground/65 flex flex-col gap-1 text-xs">
              {queuedDownloads.slice(0, 4).map((task) => (
                <span key={task.key} className="truncate">
                  {task.title}
                </span>
              ))}
              {queuedDownloads.length > 4 && (
                <span>
                  {t('downloads.moreQueued', {
                    count: queuedDownloads.length - 4,
                  })}
                </span>
              )}
            </div>
          </section>
        )}

        {pendingCount === 0 && !isScanning && (
          <div className="text-foreground/65 flex flex-col gap-1 text-xs">
            {completedCount > 0 && (
              <span>{t('downloads.saved', { count: completedCount })}</span>
            )}
            {failedCount > 0 && (
              <span>{t('downloads.failed', { count: failedCount })}</span>
            )}
            {completedCount === 0 && failedCount === 0 && (
              <span>{t('downloads.empty')}</span>
            )}
          </div>
        )}
      </div>
    </Popover>
  );
};
