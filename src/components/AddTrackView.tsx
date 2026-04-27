import {
  Check,
  Circle,
  Music2,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AppUser,
  DraftTimestamp,
  TrackCreateInput,
  Visibility,
  YoutubeMetadata,
} from "../types";
import { suggestedTags } from "../lib/mockData";
import { getYoutubeMetadata } from "../lib/api";
import { extractYouTubeVideoId, normalizeTag, thumbnailFor } from "../lib/youtube";

type AddTrackViewProps = {
  currentUser: AppUser | null;
  onCancel: () => void;
  onSubmit: (input: TrackCreateInput) => Promise<void>;
};

const emptyTimestamp = (): DraftTimestamp => ({ time: "", body: "" });

export function AddTrackView({
  currentUser,
  onCancel,
  onSubmit,
}: AddTrackViewProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [metadata, setMetadata] = useState<YoutubeMetadata | null>(null);
  const [metadataError, setMetadataError] = useState("");
  const [tags, setTags] = useState(["青春", "夜"]);
  const [tagDraft, setTagDraft] = useState("");
  const [reason, setReason] = useState("");
  const [timestamps, setTimestamps] = useState<DraftTimestamp[]>([
    { time: "0:42", body: "" },
  ]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [saving, setSaving] = useState(false);

  const videoId = useMemo(() => extractYouTubeVideoId(youtubeUrl), [youtubeUrl]);

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
      current.length === 1
        ? [emptyTimestamp()]
        : current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const submit = async (event?: FormEvent, nextVisibility = visibility) => {
    event?.preventDefault();
    if (!metadata || !videoId || !reason.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        youtubeUrl,
        videoId,
        title: metadata.title,
        artist: metadata.authorName,
        thumbnailUrl: metadata.thumbnailUrl,
        tags,
        reason: reason.trim(),
        timestamps,
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
          <button className="border-b-2 border-indigo-600 px-3 py-3 text-indigo-700">
            最近の投稿
          </button>
          <button className="px-3 py-3 text-slate-500">あなたの投稿</button>
        </div>
        <div className="mt-5 space-y-5">
          {[
            ["夜に駆ける", "YOASOBI", "青春", "夜", "通学"],
            ["水平線", "back number", "ドライブ", "海", "エモい"],
            ["怪獣の花唄", "Vaundy", "作業用", "落ち着く", "夜"],
            ["光の中へ", "結束バンド", "希望", "朝", "元気が出る"],
          ].map(([title, artist, ...previewTags]) => (
            <div key={title} className="border-b border-slate-100 pb-5">
              <p className="font-bold text-slate-950">{title}</p>
              <p className="mt-1 text-sm text-slate-600">{artist}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {previewTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p className="font-bold text-indigo-800">タグは検索で使われます</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedTags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-indigo-100 bg-white px-2 py-1 text-xs font-semibold text-indigo-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
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
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
                <img
                  src={metadata.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 grid place-items-center bg-slate-950/20 text-white">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-white/60 bg-white/20 backdrop-blur-sm">
                    <Music2 className="h-6 w-6" />
                  </span>
                </span>
              </div>
              <div className="min-w-0 self-center">
                <h2 className="truncate text-xl font-bold text-slate-950">
                  {metadata.title}
                </h2>
                <p className="mt-2 text-slate-700">{metadata.authorName}</p>
                <span className="mt-5 inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
                  YouTube
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
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
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
        </section>

        <section className="mt-6 space-y-3">
          <StepLabel number="3" label="おすすめ理由" />
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
          <StepLabel number="4" label="お気に入りのシーン・タイムスタンプ" />
          <div className="space-y-2">
            {timestamps.map((timestamp, index) => (
              <div
                key={index}
                className="grid grid-cols-[88px_1fr_auto] gap-2 max-sm:grid-cols-[1fr_auto]"
              >
                <input
                  value={timestamp.time}
                  onChange={(event) =>
                    updateTimestamp(index, "time", event.target.value)
                  }
                  placeholder="0:42"
                  className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-indigo-700 max-sm:col-span-2"
                />
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
            onClick={() => setTimestamps((current) => [...current, emptyTimestamp()])}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-300"
          >
            <Plus className="h-4 w-4" />
            タイムスタンプを追加
          </button>
        </section>

        <section className="mt-7 space-y-3">
          <StepLabel number="5" label="公開設定" />
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
