export type YoutubeMetadata = {
  videoId: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
};

export function extractYouTubeVideoId(value: string): string | null {
  const input = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");
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

function thumbnailFor(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export async function fetchYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL.");
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const fallback: YoutubeMetadata = {
    videoId,
    title: `YouTube Video ${videoId}`,
    authorName: "YouTube",
    thumbnailUrl: thumbnailFor(videoId),
  };

  const response = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`,
  );
  if (!response.ok) {
    return fallback;
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
}
