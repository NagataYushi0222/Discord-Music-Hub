import {
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import type { ChangeEvent } from "react";
import type { Track } from "../types";
import { formatSeconds } from "../lib/youtubePlayer";

type PlayerBarProps = {
  track: Track | null;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlayback: () => void;
  onSeek: (seconds: number) => void;
  onSeekBy: (offset: number) => void;
  onVolumeChange: (volume: number) => void;
};

export function PlayerBar({
  track,
  isReady,
  isPlaying,
  currentTime,
  duration,
  volume,
  onTogglePlayback,
  onSeek,
  onSeekBy,
  onVolumeChange,
}: PlayerBarProps) {
  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(event.target.value));
  };

  const handleVolume = (event: ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(Number(event.target.value));
  };

  if (!track) {
    return null;
  }

  const canControl = isReady && duration > 0;
  const displayCurrentTime = formatSeconds(currentTime);
  const displayDuration = duration ? formatSeconds(duration) : "--:--";

  return (
    <div className="fixed inset-x-0 bottom-0 z-30">
      <div className="border-t border-slate-200 bg-white/95 px-6 py-3 shadow-[0_-18px_40px_rgba(25,38,80,0.08)] backdrop-blur max-sm:px-3">
        <div className="mx-auto grid max-w-[1440px] grid-cols-[260px_1fr_260px] items-center gap-5 max-lg:grid-cols-[1fr_auto] max-sm:grid-cols-1">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onTogglePlayback}
              className="focus-ring relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100"
              aria-label={isPlaying ? "一時停止" : "再生"}
              title={isPlaying ? "一時停止" : "再生"}
            >
              <img
                src={track.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 grid place-items-center bg-slate-950/25 text-white">
                <Play className="h-5 w-5 fill-current" />
              </span>
            </button>
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-950">{track.title}</p>
              <p className="truncate text-sm text-slate-600">{track.artist}</p>
            </div>
            <Heart className="ml-auto h-5 w-5 text-slate-500" />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-center gap-6 text-slate-700 max-sm:gap-4">
              <Shuffle className="h-5 w-5" />
              <button
                type="button"
                disabled={!canControl}
                onClick={() => onSeekBy(-10)}
                className="focus-ring rounded-md p-1 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="10秒戻る"
                title="10秒戻る"
              >
                <SkipBack className="h-5 w-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={onTogglePlayback}
                className="grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500"
                aria-label={isPlaying ? "一時停止" : "再生"}
                title={isPlaying ? "一時停止" : "再生"}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 fill-current" />
                ) : (
                  <Play className="h-6 w-6 fill-current" />
                )}
              </button>
              <button
                type="button"
                disabled={!canControl}
                onClick={() => onSeekBy(10)}
                className="focus-ring rounded-md p-1 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="10秒進む"
                title="10秒進む"
              >
                <SkipForward className="h-5 w-5 fill-current" />
              </button>
              <Repeat2 className="h-5 w-5 opacity-45" />
            </div>
            <div className="grid grid-cols-[40px_1fr_40px] items-center gap-3 text-xs text-slate-500">
              <span>{displayCurrentTime}</span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={1}
                value={Math.min(currentTime, duration || 1)}
                disabled={!canControl}
                onChange={handleSeek}
                className="focus-ring h-1.5 w-full accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="再生位置"
              />
              <span>{displayDuration}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 text-slate-700 max-lg:hidden">
            <Volume2 className="h-5 w-5" />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={handleVolume}
              className="focus-ring h-1.5 w-28 accent-indigo-600"
              aria-label="音量"
            />
            <ListMusic className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}
