import { ExternalLink, Eye, Heart, Link2, MoreVertical, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { Track } from "../types";

type TrackCardProps = {
  track: Track;
  active: boolean;
  canDelete: boolean;
  onSelect: (track: Track) => void;
  onLike: (track: Track) => void;
  onDelete: (track: Track) => void;
};

function compactNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 1 : 1)}K`;
  }
  return String(value);
}

export function TrackCard({
  track,
  active,
  canDelete,
  onSelect,
  onLike,
  onDelete,
}: TrackCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const copyLink = async () => {
    const url = `${window.location.origin}/?track=${encodeURIComponent(track.id)}`;
    await navigator.clipboard?.writeText(url).catch(() => null);
    setMenuOpen(false);
  };

  return (
    <article
      className={clsx(
        "soft-card grid grid-cols-[132px_1fr_auto] gap-5 rounded-lg p-3 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg max-sm:grid-cols-[96px_1fr]",
        active && "border-indigo-500 bg-indigo-50/40",
      )}
    >
      <button
        type="button"
        className="focus-ring group relative h-[96px] overflow-hidden rounded-lg bg-slate-100 max-sm:h-[74px]"
        onClick={() => onSelect(track)}
        aria-label={`${track.title}を選択`}
      >
        <img
          src={track.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute inset-0 grid place-items-center bg-slate-950/20">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/70 bg-white/20 text-white backdrop-blur-sm max-sm:h-10 max-sm:w-10">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelect(track)}
        className="focus-ring min-w-0 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-950">
              {track.title}
            </h3>
            <p className="mt-1 truncate text-sm text-slate-700">
              {track.artist}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[minmax(130px,auto)_1fr] items-start gap-4 max-md:grid-cols-1 max-md:gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">追加者</p>
            <div className="mt-1 flex items-center gap-2">
              <img
                src={track.addedBy.avatarUrl}
                alt=""
                className="h-6 w-6 rounded-full"
              />
              <span className="truncate text-sm text-slate-700">
                {track.addedBy.username}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">おすすめ理由</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-700">
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
      </button>

      <div className="flex min-w-[128px] flex-col items-end justify-center gap-4 text-sm text-slate-600 max-sm:col-span-2 max-sm:min-w-0 max-sm:flex-row max-sm:items-center max-sm:justify-between">
        <button
          type="button"
          onClick={() => onLike(track)}
          className={clsx(
            "focus-ring flex items-center gap-2 rounded-md px-2 py-1 font-semibold",
            track.likedByMe
              ? "text-rose-500"
              : "text-slate-500 hover:text-rose-500",
          )}
          aria-label={track.likedByMe ? "いいねを外す" : "いいねする"}
        >
          <Heart
            className={clsx("h-5 w-5", track.likedByMe && "fill-current")}
          />
          {track.likes}
        </button>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          {compactNumber(track.views)}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="focus-ring rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="その他"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-xl">
              <button
                type="button"
                onClick={() => {
                  onSelect(track);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Play className="h-4 w-4" />
                再生
              </button>
              <a
                href={track.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                YouTubeで開く
              </a>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Link2 className="h-4 w-4" />
                リンクをコピー
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(track);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  削除
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
