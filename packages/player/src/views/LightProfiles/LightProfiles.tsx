import { FeatherIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { FC, FormEvent, useEffect, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type {
  PlaylistIndexEntry,
  PlaylistIndexNode,
} from '@nuclearplayer/model';
import { Button, ViewShell } from '@nuclearplayer/ui';

import { commands, LightProfile } from '../../services/tauri/bindings';
import { usePlaylistStore } from '../../stores/playlistStore';

const inputClassName =
  'border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus-visible:ring-primary h-10 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2';

const PROFILE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

const flattenPlaylists = (nodes: PlaylistIndexNode[]): PlaylistIndexEntry[] =>
  nodes.flatMap((node) => (node.kind === 'folder' ? node.playlists : [node]));

type ProfileCardProps = {
  profile: LightProfile;
  playlists: PlaylistIndexEntry[];
  onTogglePlaylist: (playlistId: string) => void;
  onRemove: () => void;
};

const ProfileCard: FC<ProfileCardProps> = ({
  profile,
  playlists,
  onTogglePlaylist,
  onRemove,
}) => {
  const { t } = useTranslation('preferences');

  return (
    <li
      className="border-foreground/15 bg-background/40 flex flex-col gap-3 rounded-xl border p-4"
      data-testid={`light-profile-${profile.name}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {t('lightProfiles.launcherName', { name: profile.name })}
          </p>
          <p className="text-foreground/60 text-xs">
            {t('lightProfiles.chosenCount', {
              count: profile.playlistIds.length,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('lightProfiles.remove', { name: profile.name })}
          onClick={onRemove}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
      <ul className="grid gap-1 md:grid-cols-2">
        {playlists.map((playlist) => (
          <li key={playlist.id}>
            <label className="hover:bg-foreground/5 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={profile.playlistIds.includes(playlist.id)}
                onChange={() => onTogglePlaylist(playlist.id)}
              />
              <span className="truncate">{playlist.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </li>
  );
};

export const LightProfiles: FC = () => {
  const { t } = useTranslation('preferences');
  const index = usePlaylistStore((state) => state.index);
  const playlists = flattenPlaylists(index);
  const [profiles, setProfiles] = useState<LightProfile[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void commands.lightProfilesList().then((result) => {
      if (result.status === 'ok') {
        setProfiles(result.data);
      } else {
        setError(result.error);
      }
    });
  }, []);

  const save = async (next: LightProfile[]) => {
    const result = await commands.lightProfilesSave(next);
    if (result.status === 'error') {
      setError(result.error);
      return;
    }
    setError(null);
    setProfiles(next);
  };

  const trimmedName = newName.trim();
  const nameTaken = profiles.some(
    (profile) => profile.name.toLowerCase() === trimmedName.toLowerCase(),
  );
  const canAdd =
    PROFILE_NAME_PATTERN.test(trimmedName) && !nameTaken && trimmedName !== '';

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAdd) {
      return;
    }
    void save([...profiles, { name: trimmedName, playlistIds: [] }]);
    setNewName('');
  };

  const togglePlaylist = (profileName: string, playlistId: string) =>
    save(
      profiles.map((profile) =>
        profile.name !== profileName
          ? profile
          : {
              ...profile,
              playlistIds: profile.playlistIds.includes(playlistId)
                ? profile.playlistIds.filter((id) => id !== playlistId)
                : [...profile.playlistIds, playlistId],
            },
      ),
    );

  return (
    <ViewShell title={t('lightProfiles.title')}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10">
        <div className="text-foreground/70 text-sm">
          <p>{t('lightProfiles.description')}</p>
          <p className="mt-2">{t('lightProfiles.blocking')}</p>
        </div>

        <form
          className="border-foreground/15 bg-background/60 flex items-end gap-3 rounded-xl border p-4"
          onSubmit={handleAdd}
        >
          <label className="flex flex-1 flex-col gap-2 text-sm font-medium">
            {t('lightProfiles.name')}
            <input
              className={inputClassName}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={t('lightProfiles.namePlaceholder')}
              data-testid="light-profile-name-input"
            />
          </label>
          <Button type="submit" disabled={!canAdd}>
            <PlusIcon className="mr-2 size-4" />
            {t('lightProfiles.add')}
          </Button>
        </form>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        {profiles.length === 0 ? (
          <div className="border-foreground/15 text-foreground/60 flex items-center gap-3 rounded-xl border border-dashed p-5 text-sm">
            <FeatherIcon className="size-5 shrink-0" />
            {t('lightProfiles.empty')}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.name}
                profile={profile}
                playlists={playlists}
                onTogglePlaylist={(playlistId) =>
                  void togglePlaylist(profile.name, playlistId)
                }
                onRemove={() =>
                  void save(
                    profiles.filter(
                      (candidate) => candidate.name !== profile.name,
                    ),
                  )
                }
              />
            ))}
          </ul>
        )}
      </div>
    </ViewShell>
  );
};
