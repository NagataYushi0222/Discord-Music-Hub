import {
  Check,
  Circle,
  Clock3,
  ExternalLink,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type {
  AppUser,
  DraftTimestamp,
  Track,
  TrackCreateInput,
  Visibility,
  YoutubeMetadata,
} from "../types";
import { getYoutubeMetadata } from "../lib/api";
import { extractYouTubeVideoId, normalizeTag, thumbnailFor } from "../lib/youtube";
import {
  formatSeconds,
  loadYouTubeApi,
  type YouTubePlayer,
} from "../lib/youtubePlayer";

type AddTrackViewProps = {
  currentUser: AppUser | null;
  tracks: Track[];
  tagSuggestions: string[];
  genreSuggestions: string[];
  onCancel: () => void;
  onSubmit: (input: TrackCreateInput) => Promise<void>;
};

const emptyTimestamp = (): DraftTimestamp => ({ time: "", body: "" });

export function AddTrackView({
  currentUser,
  tracks,
  tagSuggestions,
  genreSuggestions,
  onCancel,
  onSubmit,
}: AddTrackViewProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [metadata, setMetadata] = useState<YoutubeMetadata | null>(null);
  const [metadataError, setMetadataError] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [genre, setGenre] = useState("");
  const [reason, setReason] = useState("");
  const [timestamps, setTimestamps] = useState<DraftTimestamp[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [saving, setSaving] = useState(false);
  const [historyTab, setHistoryTab] = useState<"recent" | "mine">("recent");
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerError, setPlayerError] = useState("");
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);

  const videoId = useMemo(() => extractYouTubeVideoId(youtubeUrl), [youtubeUrl]);
  const tagCandidateQuery = normalizeTag(tagDraft).toLocaleLowerCase();
  const displayedTagSuggestions = useMemo(() => {
    return tagSuggestions
      .filter((tag) => !tags.includes(tag))
      .filter((tag) =>
        tagCandidateQuery
          ? tag.toLocaleLowerCase().startsWith(tagCandidateQuery)
          : true,
      )
      .slice(0, 8);
  }, [tagCandidateQuery, tagSuggestions, tags]);
  const displayedGenreSuggestions = useMemo(() => {
    const query = genre.trim().toLocaleLowerCase();
    return genreSuggestions
      .filter((item) => item.toLocaleLowerCase() !== query)
      .filter((item) =>
        query ? item.toLocaleLowerCase().startsWith(query) : true,
      )
      .slice(0, 6);
  }, [genre, genreSuggestions]);
  const historyTracks = useMemo(() => {
    const source =
      historyTab === "mine" && currentUser
        ? tracks.filter((track) => track.addedBy.id === currentUser.id)
        : tracks;
    return [...source]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
  }, [currentUser, historyTab, tracks]);

  useEffect(() => {
    let cancelled = false;
    setMetadataError("");

    if (!videoId) {
      setMetadata(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const nextMetadata = await getYoutubeMetadata(youtubeUrl);
        if (!cancelled) {
          setMetadata(nextMetadata);
        }
      } catch (error) {
        if (!cancelled) {
          setMetadata({
            videoId,
            title: `YouTube Video ${videoId}`,
            authorName: "YouTube",
            thumbnailUrl: thumbnailFor(videoId),
          });
          setMetadataError(
            error instanceof Error ? error.message : "動画情報を取得できませんでした。",
          );
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [videoId, youtubeUrl]);

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container || !videoId) {
      playerRef.current = null;
      setPlayer(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    let cancelled = false;
    const mount = document.createElement("div");
    mount.className = "h-full w-full";
    container.replaceChildren(mount);
    setPlayer(null);
    setPlayerError("");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    void loadYouTubeApi().then((YT) => {
      if (cancelled) {
        return;
      }

      const nextPlayer = new YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) {
              return;
            }
            playerRef.current = event.target;
            setPlayer(event.target);
            setDuration(event.target.getDuration() || 0);
          },
          onStateChange: (event) => {
            if (typeof event.data !== "number") {
              return;
            }
            setIsPlaying(event.data === 1);
            if (event.data === 0 || event.data === 2) {
              setIsPlaying(false);
            }
          },
          onError: () => {
            setPlayerError(
              "この動画は投稿画面で埋め込み再生できません。YouTube上で確認してください。",
            );
            setPlayer(null);
          },
        },
      });

      playerRef.current = nextPlayer;
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // The iframe may already be gone while switching URLs.
      }
      playerRef.current = null;
      setPlayer(null);
      container.replaceChildren();
    };
  }, [metadata?.videoId, videoId]);

  useEffect(() => {
    if (!player) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentTime(player.getCurrentTime() || 0);
      setDuration(player.getDuration() || 0);
      setIsPlaying(player.getPlayerState() === 1);
    }, 500);

    return () => window.clearInterval(timer);
  }, [player]);

  const addTag = (value: string) => {
    const nextTag = normalizeTag(value);
    if (!nextTag || tags.includes(nextTag)) {
      return;
    }
    setTags((current) => [...current, nextTag].slice(0, 8));
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((item) => item !== tag));
  };

  const updateTimestamp = (
    index: number,
    field: keyof DraftTimestamp,
    value: string,
  ) => {
    setTimestamps((current) =>
      current.map((timestamp, currentIndex) =>
        currentIndex === index ? { ...timestamp, [field]: value } : timestamp,
      ),
    );
  };

  const removeTimestamp = (index: number) => {
    setTimestamps((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const setTimestampToCurrentTime = (index: number) => {
    updateTimestamp(index, "time", formatSeconds(currentTime));
  };

  const addTimestampAtCurrentTime = () => {
    setTimestamps((current) => [
      ...current,
      { time: formatSeconds(currentTime), body: "" },
    ]);
  };

  const togglePreviewPlayback = () => {
    if (!player) {
      return;
    }
    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
    } else {
      player.playVideo();
      setIsPlaying(true);
    }
  };

  const seekPreviewBy = (offset: number) => {
    if (!player) {
      return;
    }
    const nextTime = Math.max(0, Math.min(currentTime + offset, duration || currentTime + offset));
    player.seekTo(nextTime, true);
    setCurrentTime(nextTime);
  };

  const submit = async (event?: FormEvent, nextVisibility = visibility) => {
    event?.preventDefault();
    if (!metadata || !videoId || !reason.trim()) {
      return;
    }

    const filledTimestamps = timestamps.filter(
      (timestamp) => timestamp.time.trim() || timestamp.body.trim(),
    );

    setSaving(true);
    try {
      await onSubmit({
        youtubeUrl,
        videoId,
        title: metadata.title,
        artist: metadata.authorName,
        thumbnailUrl: metadata.thumbnailUrl,
        genre: genre.trim(),
        tags,
        reason: reason.trim(),
        timestamps: filledTimestamps,
        visibility: nextVisibility,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-[1440px] grid-cols-[320px_1fr_300px] gap-6 px-6 pb-10 pt-6 max-xl:grid-cols-[260px_1fr] max-lg:grid-cols-1 max-sm:px-3">
      <aside className="glass-panel rounded-lg p-4 max-xl:hidden">
        <div className="grid grid-cols-2 border-b border-slate-200 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setHistoryTab("recent")}
            className={clsx(
              "border-b-2 px-3 py-3",
              historyTab === "recent"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500",
            )}
          >
            最近の投稿
          </button>
          <button
            type="button"
            onClick={() => setHistoryTab("mine")}
            className={clsx(
              "border-b-2 px-3 py-3",
              historyTab === "mine"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500",
            )}
          >
            あなたの投稿
          </button>
        </div>
        <div className="mt-5 space-y-5">
          {historyTracks.length ? (
            historyTracks.map((track) => (
              <div key={track.id} className="border-b border-slate-100 pb-5">
                <p className="line-clamp-2 font-bold text-slate-950">
                  {track.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">{track.artist}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {track.genre ? (
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {track.genre}
                    </span>
                  ) : null}
                  {track.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-sm text-slate-500">
              まだ表示できる投稿がありません
            </p>
          )}
        </div>
        {tagSuggestions.length ? (
          <div className="mt-5 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="font-bold text-indigo-800">タグは検索で使われます</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tagSuggestions.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-indigo-100 bg-white px-2 py-1 text-xs font-semibold text-indigo-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </aside>

      <form
        onSubmit={(event) => submit(event)}
        className="glass-panel rounded-lg p-6 max-sm:p-4"
      >
        <div className="mb-6 flex items-center gap-3">
          <Music2 className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-950">曲を追加</h1>
        </div>

        <section className="space-y-3">
          <StepLabel number="1" label="YouTube URL" />
          <div className="grid grid-cols-[1fr_auto] gap-3 max-sm:grid-cols-1">
            <input
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="focus-ring rounded-lg border border-slate-200 px-4 py-3"
            />
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-emerald-600">
              {videoId ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              {videoId ? "動画を取得しました" : "URL待ち"}
            </span>
          </div>
          {metadataError ? (
            <p className="text-sm text-amber-700">{metadataError}</p>
          ) : null}
          {metadata ? (
            <div className="grid grid-cols-[220px_1fr] gap-5 rounded-lg border border-slate-200 p-3 max-sm:grid-cols-1">
              <div>
                <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
                  <div
                    ref={playerContainerRef}
                    className="h-full w-full"
                    title={`${metadata.title} YouTube player`}
                  />
                  {playerError ? (
                    <div className="absolute inset-0 grid place-items-center bg-slate-950/90 p-3 text-center text-white">
                      <div>
                        <p className="text-xs font-semibold leading-5">
                          {playerError}
                        </p>
                        <a
                          href={youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring mt-3 inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-red-600"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          YouTubeで開く
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 text-xs text-slate-600">
                  <button
                    type="button"
                    disabled={!player}
                    onClick={() => seekPreviewBy(-10)}
                    className="focus-ring inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 font-semibold disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    10秒
                  </button>
                  <button
                    type="button"
                    disabled={!player}
                    onClick={togglePreviewPlayback}
                    className="focus-ring grid h-8 w-8 place-items-center rounded-full bg-indigo-600 text-white disabled:opacity-40"
                    aria-label={isPlaying ? "一時停止" : "再生"}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={1}
                    value={Math.min(currentTime, duration || 1)}
                    disabled={!player || !duration}
                    onChange={(event) => {
                      const nextTime = Number(event.target.value);
                      player?.seekTo(nextTime, true);
                      setCurrentTime(nextTime);
                    }}
                    className="focus-ring h-1.5 accent-indigo-600 disabled:opacity-40"
                    aria-label="投稿画面の再生位置"
                  />
                  <button
                    type="button"
                    disabled={!player}
                    onClick={() => seekPreviewBy(10)}
                    className="focus-ring inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 font-semibold disabled:opacity-40"
                  >
                    10秒
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="min-w-0 self-center">
                <h2 className="truncate text-xl font-bold text-slate-950">
                  {metadata.title}
                </h2>
                <p className="mt-2 text-slate-700">{metadata.authorName}</p>
                <span className="mt-5 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
                  <Clock3 className="h-4 w-4" />
                  {formatSeconds(currentTime)} / {duration ? formatSeconds(duration) : "--:--"}
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-6 space-y-3">
          <StepLabel number="2" label="タグ" />
          <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => removeTag(tag)}
                className="focus-ring inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-700"
              >
                #{tag}
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
            <input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag(tagDraft);
                }
              }}
              placeholder="タグを入力"
              className="focus-ring min-w-36 flex-1 px-2 py-1 text-sm outline-none"
            />
          </div>
          {displayedTagSuggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {displayedTagSuggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="focus-ring rounded-md border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:border-indigo-300"
                >
                  #{tag}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-6 space-y-3">
          <StepLabel number="3" label="ジャンル" />
          <input
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            list="genre-suggestions"
            maxLength={40}
            placeholder="例: J-POP / ロック / 作業用BGM"
            className="focus-ring w-full rounded-lg border border-slate-200 px-4 py-3"
          />
          <datalist id="genre-suggestions">
            {genreSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          {displayedGenreSuggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {displayedGenreSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGenre(item)}
                  className="focus-ring rounded-md border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:border-emerald-300"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-6 space-y-3">
          <StepLabel number="4" label="おすすめ理由" />
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            rows={4}
            placeholder="この曲をおすすめしたい理由"
            className="focus-ring w-full resize-none rounded-lg border border-slate-200 px-4 py-3 leading-7"
          />
          <p className="text-right text-xs text-slate-500">{reason.length} / 300</p>
        </section>

        <section className="mt-6 space-y-3">
          <StepLabel number="5" label="お気に入りのシーン・タイムスタンプ" />
          {timestamps.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
              タイムスタンプは未設定でも投稿できます
            </p>
          ) : null}
          <div className="space-y-2">
            {timestamps.map((timestamp, index) => (
              <div
                key={index}
                className="grid grid-cols-[88px_auto_1fr_auto] gap-2 max-sm:grid-cols-[1fr_auto]"
              >
                <input
                  value={timestamp.time}
                  onChange={(event) =>
                    updateTimestamp(index, "time", event.target.value)
                  }
                  placeholder="0:42"
                  className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-indigo-700 max-sm:col-span-2"
                />
                <button
                  type="button"
                  onClick={() => setTimestampToCurrentTime(index)}
                  className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  現在位置
                </button>
                <input
                  value={timestamp.body}
                  onChange={(event) =>
                    updateTimestamp(index, "body", event.target.value)
                  }
                  placeholder="ここが好き"
                  className="focus-ring rounded-lg border border-slate-200 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => removeTimestamp(index)}
                  className="focus-ring grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="タイムスタンプを削除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              player
                ? addTimestampAtCurrentTime()
                : setTimestamps((current) => [...current, emptyTimestamp()])
            }
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-300"
          >
            <Plus className="h-4 w-4" />
            タイムスタンプを追加
          </button>
        </section>

        <section className="mt-7 space-y-3">
          <StepLabel number="6" label="公開設定" />
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <VisibilityOption
              active={visibility === "public"}
              label="すぐに公開"
              description="コミュニティの全メンバーに公開"
              onClick={() => setVisibility("public")}
            />
            <VisibilityOption
              active={visibility === "draft"}
              label="下書き"
              description="自分だけが閲覧できます"
              onClick={() => setVisibility("draft")}
            />
          </div>
        </section>

        <div className="mt-8 grid grid-cols-[1fr_1fr_auto] gap-3 max-sm:grid-cols-1">
          <button
            type="button"
            onClick={onCancel}
            className="focus-ring rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={!metadata || saving}
            onClick={() => submit(undefined, "draft")}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            下書き保存
          </button>
          <button
            type="submit"
            disabled={!metadata || !reason.trim() || saving}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
            投稿する
          </button>
        </div>
      </form>

      <aside className="glass-panel rounded-lg p-4 max-xl:col-start-2 max-lg:col-start-auto">
        <p className="font-bold text-slate-950">投稿プレビュー</p>
        <p className="mt-1 text-sm text-slate-500">
          このようにコミュニティに表示されます
        </p>
        <div className="mt-5 rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-[96px_1fr] gap-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {metadata ? (
                <img
                  src={metadata.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">
                {metadata?.title || "曲名"}
              </p>
              <p className="mt-1 truncate text-sm text-slate-600">
                {metadata?.authorName || "アーティスト"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={currentUser?.avatarUrl || ""}
                  alt=""
                  className="h-5 w-5 rounded-full bg-slate-100"
                />
                <span className="truncate text-sm text-slate-600">
                  {currentUser?.username || "guest"}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {genre.trim() ? (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                {genre.trim()}
              </span>
            ) : null}
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700"
              >
                #{tag}
              </span>
            ))}
          </div>
          <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-700">
            {reason || "おすすめ理由"}
          </p>
        </div>
      </aside>
    </main>
  );
}

function StepLabel({ number, label }: { number: string; label: string }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-bold text-slate-950">
      <span className="grid h-5 w-5 place-items-center rounded-full border border-indigo-500 text-xs text-indigo-600">
        {number}
      </span>
      {label}
    </h2>
  );
}

function VisibilityOption({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-indigo-200"
    >
      <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full border border-indigo-500">
        {active ? <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> : null}
      </span>
      <span>
        <span className="block font-bold text-slate-950">{label}</span>
        <span className="mt-1 block text-sm text-slate-500">{description}</span>
      </span>
    </button>
  );
}
