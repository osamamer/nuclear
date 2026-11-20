import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { FeatherIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { FC, FormEvent, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type {
  AlbumRef,
  PlaylistIndexEntry,
  PlaylistIndexNode,
} from '@nuclearplayer/model';
import { Button, ViewShell } from '@nuclearplayer/ui';

import { albumDetailsQuery } from '../../queries/albumDetails';
import { albumAsProfilePlaylist } from '../../services/lightProfile';
import {
  commands,
  LightProfile,
  LightProfileAlbum,
} from '../../services/tauri/bindings';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { usePlaylistStore } from '../../stores/playlistStore';

const inputClassName =
  'border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus-visible:ring-primary h-10 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2';

const PROFILE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const profilesKey = ['light-profiles'];

const flattenPlaylists = (nodes: PlaylistIndexNode[]): PlaylistIndexEntry[] =>
  nodes.flatMap((node) => (node.kind === 'folder' ? node.playlists : [node]));

const albumKey = ({ source }: AlbumRef) =>
  JSON.stringify([source.provider, source.id]);

const albumLabel = ({ title, artists }: AlbumRef) =>
  [title, artists?.map((artist) => artist.name).join(', ')]
    .filter(Boolean)
    .join(' · ');

type ProfileCardProps = {
  profile: LightProfile;
  playlists: PlaylistIndexEntry[];
  favoriteAlbums: Map<string, AlbumRef>;
  disabled: boolean;
  onTogglePlaylist: (playlistId: string) => void;
  onToggleAlbum: (key: string) => void;
  onRemove: () => void;
};

const ProfileCard: FC<ProfileCardProps> = ({
  profile,
  playlists,
  favoriteAlbums,
  disabled,
  onTogglePlaylist,
  onToggleAlbum,
  onRemove,
}) => {
  const { t } = useTranslation('preferences');
  const profileAlbums = profile.albums ?? [];
  const albumOptions = new Map(
    [...favoriteAlbums].map(([key, ref]) => [key, albumLabel(ref)]),
  );
  for (const album of profileAlbums) {
    albumOptions.set(album.key, album.label);
  }
  const selectedAlbums = new Set(profileAlbums.map((album) => album.key));

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
              count: profile.playlistIds.length + profileAlbums.length,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('lightProfiles.remove', { name: profile.name })}
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
      {playlists.length > 0 && (
        <fieldset disabled={disabled} className="grid gap-1 md:grid-cols-2">
          <legend className="text-sm font-medium">
            {t('lightProfiles.playlists')}
          </legend>
          {playlists.map((playlist) => (
            <label
              key={playlist.id}
              className="hover:bg-foreground/5 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={profile.playlistIds.includes(playlist.id)}
                onChange={() => onTogglePlaylist(playlist.id)}
              />
              <span className="truncate">{playlist.name}</span>
            </label>
          ))}
        </fieldset>
      )}
      {albumOptions.size > 0 && (
        <fieldset disabled={disabled} className="grid gap-1 md:grid-cols-2">
          <legend className="text-sm font-medium">
            {t('lightProfiles.favoriteAlbums')}
          </legend>
          {[...albumOptions].map(([key, label]) => (
            <label
              key={key}
              className="hover:bg-foreground/5 flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedAlbums.has(key)}
                onChange={() => onToggleAlbum(key)}
              />
              <span className="truncate" title={label}>
                {label}
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </li>
  );
};

export const LightProfiles: FC = () => {
  const { t } = useTranslation('preferences');
  const queryClient = useQueryClient();
  const index = usePlaylistStore((state) => state.index);
  const playlists = flattenPlaylists(index);
  const albums = useFavoritesStore((state) => state.albums);
  const favoriteAlbums = new Map(albums.map(({ ref }) => [albumKey(ref), ref]));
  const [newName, setNewName] = useState('');
  const {
    data: profiles = [],
    isSuccess: loaded,
    error: loadError,
  } = useQuery({
    queryKey: profilesKey,
    queryFn: async () => {
      const result = await commands.lightProfilesList();
      if (result.status === 'error') {
        throw new Error(result.error);
      }
      return result.data;
    },
  });
  const { mutate: save, error: saveError } = useMutation({
    mutationKey: profilesKey,
    mutationFn: async (
      update: () => LightProfile[] | Promise<LightProfile[]>,
    ) => {
      const next = await update();
      const result = await commands.lightProfilesSave(next);
      if (result.status === 'error') {
        throw new Error(result.error);
      }
      return next;
    },
    onSuccess: async (next) => {
      await queryClient.cancelQueries({ queryKey: profilesKey });
      queryClient.setQueryData(profilesKey, next);
    },
  });
  const saving = useIsMutating({ mutationKey: profilesKey }) > 0;
  const error = saveError ?? loadError;

  const trimmedName = newName.trim();
  const nameTaken = profiles.some(
    (profile) => profile.name.toLowerCase() === trimmedName.toLowerCase(),
  );
  const canAdd =
    loaded && !saving && PROFILE_NAME_PATTERN.test(trimmedName) && !nameTaken;

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAdd) {
      return;
    }
    save(
      () => [...profiles, { name: trimmedName, playlistIds: [], albums: [] }],
      { onSuccess: () => setNewName('') },
    );
  };

  const togglePlaylist = (profileName: string, playlistId: string) =>
    save(() =>
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

  const toggleAlbum = (profile: LightProfile, key: string) =>
    save(async () => {
      const profileAlbums = profile.albums ?? [];
      let nextAlbums: LightProfileAlbum[];
      if (profileAlbums.some((album) => album.key === key)) {
        nextAlbums = profileAlbums.filter((album) => album.key !== key);
      } else {
        const ref = favoriteAlbums.get(key);
        if (!ref) {
          return profiles;
        }
        const playlist = await queryClient
          .fetchQuery(albumDetailsQuery(ref.source.provider, ref.source.id))
          .then((album) => albumAsProfilePlaylist(album, ref.title))
          .catch(() => {
            throw new Error(
              t('lightProfiles.albumLoadError', { title: ref.title }),
            );
          });
        if (playlist.items.length === 0) {
          throw new Error(t('lightProfiles.albumEmpty', { title: ref.title }));
        }
        nextAlbums = [
          ...profileAlbums,
          {
            key,
            label: albumLabel(ref),
            playlistJson: JSON.stringify(playlist),
          },
        ];
      }
      return profiles.map((candidate) =>
        candidate.name === profile.name
          ? { ...candidate, albums: nextAlbums }
          : candidate,
      );
    });

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
            {error.message}
          </p>
        )}

        {loaded && profiles.length === 0 ? (
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
                favoriteAlbums={favoriteAlbums}
                disabled={saving}
                onTogglePlaylist={(playlistId) =>
                  togglePlaylist(profile.name, playlistId)
                }
                onToggleAlbum={(key) => toggleAlbum(profile, key)}
                onRemove={() =>
                  save(() =>
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
