import type { YoutubeMetadata } from "../types";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

export function extractYouTubeVideoId(value: string): string | null {
  const input = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");

    if (!YOUTUBE_HOSTS.has(url.hostname) && !YOUTUBE_HOSTS.has(host)) {
      return null;
    }

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    const watchId = url.searchParams.get("v");
    if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) {
      return watchId;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) =>
      ["embed", "shorts", "live"].includes(part),
    );
    if (marker >= 0 && parts[marker + 1]) {
      return parts[marker + 1].slice(0, 11);
    }
  } catch {
    const match = input.match(
      /(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/,
    );
    return match?.[1] ?? null;
  }

  return null;
}

export function thumbnailFor(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function normalizeTag(tag: string): string {
  return tag.replace(/^#/, "").trim().replace(/\s+/g, "");
}

export function timestampToSeconds(time: string): number {
  const parts = time
    .split(":")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

export async function fetchYoutubeMetadata(
  youtubeUrl: string,
): Promise<YoutubeMetadata> {
  const videoId = extractYouTubeVideoId(youtubeUrl);

  if (!videoId) {
    throw new Error("YouTube URLを確認してください。");
  }

  const fallback: YoutubeMetadata = {
    videoId,
    title: `YouTube Video ${videoId}`,
    authorName: "YouTube",
    thumbnailUrl: thumbnailFor(videoId),
  };

  const targets = [
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
      youtubeWatchUrl(videoId),
    )}`,
    `https://noembed.com/embed?url=${encodeURIComponent(youtubeWatchUrl(videoId))}`,
  ];

  for (const target of targets) {
    try {
      const response = await fetch(target);
      if (!response.ok) {
        continue;
      }
      const data = (await response.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };
      return {
        videoId,
        title: data.title || fallback.title,
        authorName: data.author_name || fallback.authorName,
        thumbnailUrl: data.thumbnail_url || fallback.thumbnailUrl,
      };
    } catch {
      continue;
    }
  }

  return fallback;
}
