import {
  Bookmark,
  Clock3,
  ExternalLink,
  Heart,
  Send,
  Share2,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { Track } from "../types";
import { timestampToSeconds } from "../lib/youtube";
import {
  loadYouTubeApi,
  type YouTubePlayer,
} from "../lib/youtubePlayer";

type TrackDetailProps = {
  track: Track;
  onLike: (track: Track) => void;
  onAddTimestamp: (trackId: string, time: string, body: string) => void;
  canDelete: boolean;
  onDelete: (track: Track) => void;
  playerVolume: number;
  onPlayerReady: (player: YouTubePlayer | null) => void;
  onPlayerStateChange: (state: number) => void;
};

export function TrackDetail({
  track,
  onLike,
  onAddTimestamp,
  canDelete,
  onDelete,
  playerVolume,
  onPlayerReady,
  onPlayerStateChange,
}: TrackDetailProps) {
  const [time, setTime] = useState("");
  const [body, setBody] = useState("");
  const [playerError, setPlayerError] = useState("");
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const onPlayerStateChangeRef = useRef(onPlayerStateChange);
  const playerVolumeRef = useRef(playerVolume);
  const pendingStartRef = useRef<number | null>(null);
  const pendingPlayRef = useRef(false);

  useEffect(() => {
    onPlayerReadyRef.current = onPlayerReady;
  }, [onPlayerReady]);

  useEffect(() => {
    onPlayerStateChangeRef.current = onPlayerStateChange;
  }, [onPlayerStateChange]);

  useEffect(() => {
    playerVolumeRef.current = playerVolume;
  }, [playerVolume]);

  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    const mount = document.createElement("div");
    mount.className = "h-full w-full";
    container.replaceChildren(mount);
    setPlayerError("");
    onPlayerReadyRef.current(null);

    void loadYouTubeApi().then((YT) => {
      if (cancelled) {
        return;
      }

      const player = new YT.Player(mount, {
        videoId: track.videoId,
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
            event.target.setVolume(playerVolumeRef.current);
            onPlayerReadyRef.current(event.target);

            if (pendingStartRef.current !== null) {
              event.target.seekTo(pendingStartRef.current, true);
              event.target.playVideo();
              pendingStartRef.current = null;
              pendingPlayRef.current = false;
            } else if (pendingPlayRef.current) {
              event.target.playVideo();
              pendingPlayRef.current = false;
            }
          },
          onStateChange: (event) => {
            if (typeof event.data === "number") {
              onPlayerStateChangeRef.current(event.data);
            }
          },
          onError: (event) => {
            const message =
              event.data === 100
                ? "この動画は削除済み、非公開、または存在しないため再生できません。"
                : event.data === 101 || event.data === 150
                  ? "この動画は埋め込み再生が許可されていません。年齢制限がある場合もYouTube上での視聴が必要です。"
                  : "この動画は埋め込み再生できません。";
            setPlayerError(message);
            onPlayerReadyRef.current(null);
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      onPlayerReadyRef.current(null);
      try {
        playerRef.current?.destroy();
      } catch {
        // The iframe may already be replaced while switching tracks.
      }
      playerRef.current = null;
      pendingPlayRef.current = false;
      pendingStartRef.current = null;
      container.replaceChildren();
    };
  }, [track.id, track.videoId]);

  useEffect(() => {
    playerRef.current?.setVolume(playerVolume);
  }, [playerVolume]);

  const submitTimestamp = () => {
    if (!time.trim() || !body.trim()) {
      return;
    }
    onAddTimestamp(track.id, time, body);
    setTime("");
    setBody("");
  };

  const playTimestamp = (timestamp: string) => {
    const seconds = timestampToSeconds(timestamp);
    pendingStartRef.current = seconds;
    pendingPlayRef.current = true;
    setPlayerError("");

    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
      pendingStartRef.current = null;
      pendingPlayRef.current = false;
    }
  };

  return (
    <aside className="glass-panel sticky top-[118px] max-h-[calc(100vh-148px)] overflow-y-auto rounded-lg p-4 max-lg:static max-lg:max-h-none">
      <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-4 max-sm:grid-cols-1">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
          <div
            ref={playerContainerRef}
            className="h-full w-full"
            title={`${track.title} YouTube player`}
          />
          {playerError ? (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/90 p-4 text-center text-white">
              <div>
                <p className="text-sm font-semibold leading-6">{playerError}</p>
                <a
                  href={track.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  YouTubeで開く
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 self-start">
          <h2 className="line-clamp-2 text-xl font-bold leading-tight text-slate-950">
            {track.title}
          </h2>
          <p className="mt-2 truncate text-sm text-slate-700">{track.artist}</p>
          <div className="mt-4 grid grid-cols-[minmax(104px,auto)_1fr] gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">追加者</p>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <img
                  src={track.addedBy.avatarUrl}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full"
                />
                <span className="truncate text-sm font-semibold text-slate-700">
                  {track.addedBy.username}
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">おすすめ理由</p>
              <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-700">
                {track.reason}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {track.genre ? (
              <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {track.genre}
              </span>
            ) : null}
            {track.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onLike(track)}
          className={clsx(
            "focus-ring flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 font-semibold transition hover:border-rose-200 hover:bg-rose-50",
            track.likedByMe ? "text-rose-500" : "text-slate-700",
          )}
        >
          <Heart className={clsx("h-5 w-5", track.likedByMe && "fill-current")} />
          {track.likes}
        </button>
        <button
          type="button"
          className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Bookmark className="h-5 w-5" />
          保存
        </button>
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <UserRound className="h-5 w-5" />
          おすすめ理由
        </h3>
        <p className="mt-3 leading-7 text-slate-700">{track.reason}</p>
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Clock3 className="h-5 w-5" />
          タイムスタンプコメント
        </h3>
        <div className="mt-3 space-y-2">
          {track.timestamps.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
              まだコメントはありません
            </p>
          ) : (
            track.timestamps.map((timestamp) => (
              <button
                key={timestamp.id}
                type="button"
                onClick={() => playTimestamp(timestamp.time)}
                className="focus-ring grid w-full grid-cols-[58px_1fr] rounded-lg border border-slate-200 bg-white text-left text-sm transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                <span className="border-r border-slate-200 px-3 py-2 font-semibold text-indigo-600">
                  {timestamp.time}
                </span>
                <span className="truncate px-3 py-2 text-slate-700">
                  {timestamp.body}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="mt-3 grid grid-cols-[72px_1fr_auto] gap-2 max-sm:grid-cols-1">
          <input
            value={time}
            onChange={(event) => setTime(event.target.value)}
            placeholder="1:23"
            className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="好きな箇所をコメント"
            className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={submitTimestamp}
            className="focus-ring grid h-10 w-10 place-items-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 max-sm:w-full"
            aria-label="タイムスタンプを追加"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={clsx("mt-5 grid gap-3", canDelete ? "grid-cols-3" : "grid-cols-2")}>
        <a
          href={track.youtubeUrl}
          target="_blank"
          rel="noreferrer"
          className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 font-semibold text-red-600 hover:bg-red-50"
        >
          <ExternalLink className="h-5 w-5" />
          YouTubeで開く
        </a>
        <button
          type="button"
          className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Share2 className="h-5 w-5" />
          シェア
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(track)}
            className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-5 w-5" />
            削除
          </button>
        ) : null}
      </div>
    </aside>
  );
}
