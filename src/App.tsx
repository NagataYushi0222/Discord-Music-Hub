import {
  Bell,
  Filter,
  LogIn,
  Music2,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AddTrackView } from "./components/AddTrackView";
import { PlayerBar } from "./components/PlayerBar";
import { TrackCard } from "./components/TrackCard";
import { TrackDetail } from "./components/TrackDetail";
import {
  addTimestamp,
  createTrack,
  deleteTrack,
  getGuildSelection,
  getMe,
  listTracks,
  recordTrackView,
  selectGuild,
  setTrackLike,
} from "./lib/api";
import type { YouTubePlayer } from "./lib/youtubePlayer";
import type { AppUser, DiscordGuild, Track, TrackCreateInput } from "./types";

type ViewMode = "browse" | "add";
type TabMode = "all" | "mine";
type SortMode = "newest" | "popular" | "viewed";
type PlaybackState = {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
};

export default function App() {
  const [view, setView] = useState<ViewMode>("browse");
  const [tab, setTab] = useState<TabMode>("all");
  const [sort, setSort] = useState<SortMode>("viewed");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [me, setMe] = useState<AppUser | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [guildLoading, setGuildLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({
    isReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 62,
  });
  const volumeRef = useRef(62);
  const autoPlayNextTrackRef = useRef(false);
  const countedViewTrackIdRef = useRef<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const nextUser = await getMe();
      setMe(nextUser);

      if (!nextUser) {
        setGuilds([]);
        setSelectedGuildId("");
        setTracks([]);
        setSelectedId(null);
        return;
      }

      const guildSelection = await getGuildSelection();
      setGuilds(guildSelection.guilds);
      setSelectedGuildId(guildSelection.selectedGuildId ?? "");

      if (!guildSelection.selectedGuildId) {
        setTracks([]);
        setSelectedId(null);
        return;
      }

      const nextTracks = await listTracks();
      setTracks(nextTracks);
      setSelectedId((current) => current ?? nextTracks[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "曲一覧の読み込みに失敗しました。",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const allTags = useMemo(() => {
    return Array.from(new Set(tracks.flatMap((track) => track.tags))).slice(0, 12);
  }, [tracks]);

  const selectedGuild = useMemo(() => {
    return guilds.find((guild) => guild.id === selectedGuildId) ?? null;
  }, [guilds, selectedGuildId]);

  const canAccessTracks = Boolean(me && selectedGuildId);

  const tagSuggestions = useMemo(() => {
    const latestByTag = new Map<string, string>();
    for (const track of tracks) {
      for (const tag of track.tags) {
        const current = latestByTag.get(tag);
        if (!current || track.createdAt > current) {
          latestByTag.set(tag, track.createdAt);
        }
      }
    }
    return [...latestByTag.entries()]
      .sort((a, b) => b[1].localeCompare(a[1]) || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [tracks]);

  const genreSuggestions = useMemo(() => {
    const latestByGenre = new Map<string, string>();
    for (const track of tracks) {
      const genre = track.genre?.trim();
      if (!genre) {
        continue;
      }
      const current = latestByGenre.get(genre);
      if (!current || track.createdAt > current) {
        latestByGenre.set(genre, track.createdAt);
      }
    }
    return [...latestByGenre.entries()]
      .sort((a, b) => b[1].localeCompare(a[1]) || a[0].localeCompare(b[0]))
      .map(([genre]) => genre);
  }, [tracks]);

  const visibleTracks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = tracks.filter((track) => {
      if (track.visibility === "draft" && track.addedBy.id !== me?.id) {
        return false;
      }
      if (tab === "mine" && track.addedBy.id !== me?.id) {
        return false;
      }
      if (activeTag && !track.tags.includes(activeTag)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const target = [
        track.title,
        track.artist,
        track.genre,
        track.addedBy.username,
        track.reason,
        ...track.tags,
      ]
        .join(" ")
        .toLowerCase();
      return target.includes(normalizedQuery);
    });

    return filtered.sort((a, b) => {
      if (sort === "popular") {
        return b.likes - a.likes;
      }
      if (sort === "viewed") {
        return b.views - a.views;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [activeTag, me?.id, query, sort, tab, tracks]);

  const selectedTrack =
    visibleTracks.find((track) => track.id === selectedId) ??
    visibleTracks[0] ??
    tracks.find((track) => track.id === selectedId) ??
    null;

  const currentVisibleIndex = useMemo(() => {
    if (!selectedTrack) {
      return -1;
    }
    return visibleTracks.findIndex((track) => track.id === selectedTrack.id);
  }, [selectedTrack, visibleTracks]);

  const hasPreviousTrack = currentVisibleIndex > 0;
  const hasNextTrack =
    currentVisibleIndex >= 0 && currentVisibleIndex < visibleTracks.length - 1;

  const selectTrackByOffset = useCallback(
    (offset: number, autoPlay = true) => {
      const nextIndex = currentVisibleIndex + offset;
      const nextTrack = visibleTracks[nextIndex];
      if (!nextTrack) {
        return;
      }
      autoPlayNextTrackRef.current = autoPlay;
      setSelectedId(nextTrack.id);
    },
    [currentVisibleIndex, visibleTracks],
  );

  const handleSelectTrack = useCallback(
    (track: Track) => {
      if (track.id === selectedTrack?.id && player && playback.isReady) {
        player.playVideo();
        setPlayback((current) => ({ ...current, isPlaying: true }));
        return;
      }

      autoPlayNextTrackRef.current = true;
      setSelectedId(track.id);
    },
    [playback.isReady, player, selectedTrack?.id],
  );

  useEffect(() => {
    countedViewTrackIdRef.current = null;
    setPlayer(null);
    setPlayback((current) => ({
      ...current,
      isReady: false,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }));
  }, [selectedTrack?.id]);

  useEffect(() => {
    if (!player) {
      return;
    }

    const syncPlayback = () => {
      setPlayback((current) => ({
        ...current,
        currentTime: player.getCurrentTime() || 0,
        duration: player.getDuration() || 0,
        isPlaying: player.getPlayerState() === 1,
      }));
    };

    syncPlayback();
    const timer = window.setInterval(syncPlayback, 500);
    return () => window.clearInterval(timer);
  }, [player]);

  const handlePlayerReady = useCallback((nextPlayer: YouTubePlayer | null) => {
    setPlayer(nextPlayer);

    if (!nextPlayer) {
      setPlayback((current) => ({
        ...current,
        isReady: false,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      }));
      return;
    }

    nextPlayer.setVolume(volumeRef.current);
    if (autoPlayNextTrackRef.current) {
      nextPlayer.playVideo();
      autoPlayNextTrackRef.current = false;
    }
    setPlayback((current) => ({
      ...current,
      isReady: true,
      isPlaying: nextPlayer.getPlayerState() === 1,
      currentTime: nextPlayer.getCurrentTime() || 0,
      duration: nextPlayer.getDuration() || 0,
    }));
  }, []);

  const handlePlayerStateChange = useCallback(
    (state: number) => {
      setPlayback((current) => ({
        ...current,
        isPlaying:
          state === 1 ? true : state === 0 || state === 2 ? false : current.isPlaying,
      }));

      if (
        state === 1 &&
        selectedTrack &&
        countedViewTrackIdRef.current !== selectedTrack.id
      ) {
        countedViewTrackIdRef.current = selectedTrack.id;
        void recordTrackView(selectedTrack.id)
          .then((updated) => {
            setTracks((current) =>
              current.map((track) => (track.id === updated.id ? updated : track)),
            );
          })
          .catch(() => {
            if (countedViewTrackIdRef.current === selectedTrack.id) {
              countedViewTrackIdRef.current = null;
            }
          });
      }

      if (state === 0) {
        countedViewTrackIdRef.current = null;
        if (hasNextTrack) {
          selectTrackByOffset(1, true);
        }
      }
    },
    [hasNextTrack, selectTrackByOffset, selectedTrack],
  );

  const handleTogglePlayback = useCallback(() => {
    if (!player || !playback.isReady) {
      return;
    }

    if (playback.isPlaying) {
      player.pauseVideo();
      setPlayback((current) => ({ ...current, isPlaying: false }));
    } else {
      player.playVideo();
      setPlayback((current) => ({ ...current, isPlaying: true }));
    }
  }, [playback.isPlaying, playback.isReady, player]);

  const handleSeek = useCallback(
    (seconds: number) => {
      if (!player || !playback.duration) {
        return;
      }

      const nextTime = Math.min(Math.max(seconds, 0), playback.duration);
      player.seekTo(nextTime, true);
      setPlayback((current) => ({ ...current, currentTime: nextTime }));
    },
    [playback.duration, player],
  );

  const handleSeekBy = useCallback(
    (offset: number) => {
      handleSeek(playback.currentTime + offset);
    },
    [handleSeek, playback.currentTime],
  );

  const handleVolumeChange = useCallback(
    (volume: number) => {
      volumeRef.current = volume;
      player?.setVolume(volume);
      setPlayback((current) => ({ ...current, volume }));
    },
    [player],
  );

  const replaceTrack = (updated: Track) => {
    setTracks((current) =>
      current.map((track) => (track.id === updated.id ? updated : track)),
    );
    setSelectedId(updated.id);
  };

  const handleLike = async (track: Track) => {
    setErrorMessage("");
    try {
      const updated = await setTrackLike(track.id, !track.likedByMe);
      replaceTrack(updated);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "いいねに失敗しました。",
      );
    }
  };

  const handleAddTimestamp = async (trackId: string, time: string, body: string) => {
    setErrorMessage("");
    try {
      const updated = await addTimestamp(trackId, time, body);
      replaceTrack(updated);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "タイムスタンプコメントの追加に失敗しました。",
      );
    }
  };

  const handleDeleteTrack = async (track: Track) => {
    if (!window.confirm("この曲を削除しますか？")) {
      return;
    }

    setErrorMessage("");
    try {
      await deleteTrack(track.id);
      const remaining = tracks.filter((item) => item.id !== track.id);
      setTracks(remaining);
      const nextVisible = visibleTracks.filter((item) => item.id !== track.id);
      setSelectedId(nextVisible[0]?.id ?? remaining[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "曲の削除に失敗しました。",
      );
    }
  };

  const handleSelectGuild = async (guildId: string) => {
    if (!guildId || guildId === selectedGuildId) {
      return;
    }

    setGuildLoading(true);
    setErrorMessage("");
    try {
      const guildSelection = await selectGuild(guildId);
      setGuilds(guildSelection.guilds);
      setSelectedGuildId(guildSelection.selectedGuildId ?? guildId);
      if (!guildSelection.selectedGuildId) {
        setTracks([]);
        setSelectedId(null);
        return;
      }

      const nextTracks = await listTracks();
      setTracks(nextTracks);
      setSelectedId(nextTracks[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "サーバーの切り替えに失敗しました。",
      );
    } finally {
      setGuildLoading(false);
    }
  };

  const handleCreateTrack = async (input: TrackCreateInput) => {
    setErrorMessage("");
    try {
      const created = await createTrack(input);
      setTracks((current) => [created, ...current]);
      setSelectedId(created.id);
      setView("browse");
      setTab(input.visibility === "draft" ? "mine" : "all");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "曲の投稿に失敗しました。",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] pb-28 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-[1440px] grid-cols-[280px_180px_1fr_auto] items-center gap-7 px-6 py-4 max-xl:grid-cols-[1fr_auto] max-sm:px-3">
          <button
            type="button"
            onClick={() => setView("browse")}
            className="focus-ring flex items-center gap-4 text-left"
          >
            <span className="grid h-14 w-14 place-items-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
              <Music2 className="h-7 w-7" />
            </span>
            <span>
              <span className="block text-2xl font-bold tracking-normal text-slate-950">
                Discord Music Hub
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                コミュニティで音楽をシェアしよう
              </span>
            </span>
          </button>

          <div className="max-xl:hidden">
            {me && guilds.length ? (
              <label className="focus-within:ring-2 focus-within:ring-indigo-400/40 flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 font-semibold text-slate-700">
                {selectedGuild?.iconUrl ? (
                  <img
                    src={selectedGuild.iconUrl}
                    alt=""
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-100 text-indigo-600">
                    <Music2 className="h-4 w-4" />
                  </span>
                )}
                <select
                  value={selectedGuildId}
                  disabled={guildLoading}
                  onChange={(event) => void handleSelectGuild(event.target.value)}
                  className="min-w-0 max-w-32 appearance-none bg-transparent outline-none"
                  aria-label="Discordサーバーを選択"
                >
                  {guilds.map((guild) => (
                    <option key={guild.id} value={guild.id}>
                      {guild.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : me ? (
              <a
                href="/api/auth/discord/start"
                className="focus-ring flex h-12 items-center justify-center gap-3 rounded-lg border border-slate-200 px-4 font-semibold text-slate-700"
              >
                <RefreshCcw className="h-4 w-4" />
                サーバー取得
              </a>
            ) : (
              <div className="flex h-12 items-center justify-center gap-3 rounded-lg border border-slate-200 px-4 font-semibold text-slate-400">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100">
                  <Music2 className="h-4 w-4" />
                </span>
                Server
              </div>
            )}
          </div>

          <div className="grid gap-2 max-xl:col-span-2 max-sm:col-span-1">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <Search className="h-5 w-5 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="タグ / キーワード / ユーザーを検索..."
                className="focus-ring min-w-0 py-1 text-slate-800 outline-none"
              />
              <button
                type="button"
                className="focus-ring flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Filter className="h-4 w-4" />
                フィルター
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 5).map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
                  className={clsx(
                    "focus-ring rounded-md border px-3 py-1 text-sm font-semibold",
                    activeTag === tag
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200",
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 max-xl:row-start-1 max-xl:justify-end">
            {view === "browse" ? (
              <>
                <label className="relative max-md:hidden">
                  <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortMode)}
                    className="focus-ring h-12 appearance-none rounded-lg border border-slate-200 bg-white pl-12 pr-10 font-semibold text-slate-800"
                  >
                    <option value="viewed">Most viewed</option>
                    <option value="popular">Most liked</option>
                    <option value="newest">Newest</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!canAccessTracks}
                  onClick={() => {
                    if (canAccessTracks) {
                      setView("add");
                    }
                  }}
                  className="focus-ring grid h-14 w-14 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  aria-label="曲を追加"
                  title={
                    canAccessTracks
                      ? "曲を追加"
                      : "ログインしてDiscordサーバーを選択してください"
                  }
                >
                  <Plus className="h-7 w-7" />
                </button>
              </>
            ) : null}
            <Bell className="h-5 w-5 text-slate-600 max-md:hidden" />
            {me ? (
              <div className="flex items-center gap-2 rounded-lg px-2 py-1">
                <img src={me.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
                <span className="font-semibold text-slate-700 max-sm:hidden">
                  {me.username}
                </span>
              </div>
            ) : (
              <a
                href="/api/auth/discord/start"
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white"
              >
                <LogIn className="h-5 w-5" />
                Discord Login
              </a>
            )}
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="mx-auto mt-4 max-w-[1440px] px-6 max-sm:px-3">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        </div>
      ) : null}

      {view === "add" && canAccessTracks ? (
        <AddTrackView
          currentUser={me}
          tracks={tracks}
          tagSuggestions={tagSuggestions}
          genreSuggestions={genreSuggestions}
          onCancel={() => setView("browse")}
          onSubmit={handleCreateTrack}
        />
      ) : (
        <main className="mx-auto grid max-w-[1440px] grid-cols-[1fr_420px] gap-4 px-6 pt-6 max-lg:grid-cols-1 max-sm:px-3">
          <section className="min-w-0">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex gap-8 border-b border-slate-200 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setTab("all")}
                  className={clsx(
                    "focus-ring border-b-2 px-4 py-3",
                    tab === "all"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500",
                  )}
                >
                  すべての楽曲
                </button>
                <button
                  type="button"
                  onClick={() => setTab("mine")}
                  className={clsx(
                    "focus-ring border-b-2 px-4 py-3",
                    tab === "mine"
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500",
                  )}
                >
                  自分の投稿
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm font-semibold text-slate-600">
                <span>{visibleTracks.length}件の楽曲</span>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="focus-ring rounded-md p-2 hover:bg-white"
                  aria-label="再読み込み"
                >
                  <RefreshCcw className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="soft-card rounded-lg p-8 text-center text-slate-500">
                  読み込み中...
                </div>
              ) : !me ? (
                <div className="soft-card rounded-lg p-8 text-center text-slate-500">
                  <p className="font-semibold text-slate-700">
                    Discordログインすると曲一覧を表示できます
                  </p>
                  <a
                    href="/api/auth/discord/start"
                    className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white"
                  >
                    <LogIn className="h-4 w-4" />
                    Discord Login
                  </a>
                </div>
              ) : !selectedGuildId ? (
                <div className="soft-card rounded-lg p-8 text-center text-slate-500">
                  <p className="font-semibold text-slate-700">
                    Discordサーバーを選択すると曲一覧を表示できます
                  </p>
                  <a
                    href="/api/auth/discord/start"
                    className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    サーバー取得
                  </a>
                </div>
              ) : visibleTracks.length === 0 ? (
                <div className="soft-card rounded-lg p-8 text-center text-slate-500">
                  条件に合う曲がありません
                </div>
              ) : (
                visibleTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    active={selectedTrack?.id === track.id}
                    canDelete={track.addedBy.id === me?.id}
                    onSelect={handleSelectTrack}
                    onLike={handleLike}
                    onDelete={handleDeleteTrack}
                  />
                ))
              )}
            </div>
          </section>

          {selectedTrack ? (
            <TrackDetail
              track={selectedTrack}
              onLike={handleLike}
              onAddTimestamp={handleAddTimestamp}
              canDelete={selectedTrack.addedBy.id === me?.id}
              onDelete={handleDeleteTrack}
              playerVolume={playback.volume}
              onPlayerReady={handlePlayerReady}
              onPlayerStateChange={handlePlayerStateChange}
            />
          ) : null}
        </main>
      )}

      {view === "browse" ? (
        <PlayerBar
          track={selectedTrack}
          isReady={playback.isReady}
          isPlaying={playback.isPlaying}
          currentTime={playback.currentTime}
          duration={playback.duration}
          volume={playback.volume}
          onTogglePlayback={handleTogglePlayback}
          onSeek={handleSeek}
          onSeekBy={handleSeekBy}
          onPreviousTrack={() => selectTrackByOffset(-1, true)}
          onNextTrack={() => selectTrackByOffset(1, true)}
          onVolumeChange={handleVolumeChange}
          hasPreviousTrack={hasPreviousTrack}
          hasNextTrack={hasNextTrack}
        />
      ) : null}
    </div>
  );
}
