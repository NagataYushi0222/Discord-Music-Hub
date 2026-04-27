import type {
  AppUser,
  Track,
  TrackCreateInput,
  YoutubeMetadata,
} from "../types";
import {
  localAddTimestamp,
  localCreateTrack,
  localGetMe,
  localListTracks,
  localSetLike,
} from "./localStore";
import { fetchYoutubeMetadata } from "./youtube";

const useLocalMock =
  import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_MOCK !== "false";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const data = JSON.parse(text) as { error?: string };
      message = data.error || message;
    } catch {
      // Plain text error bodies are fine; keep the original message.
    }
    throw new Error(message || `API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getMe(): Promise<AppUser | null> {
  if (useLocalMock) {
    return localGetMe();
  }

  try {
    return await requestJson<AppUser>("/api/me");
  } catch {
    return null;
  }
}

export async function listTracks(): Promise<Track[]> {
  if (useLocalMock) {
    return localListTracks();
  }

  return requestJson<Track[]>("/api/tracks");
}

export async function createTrack(input: TrackCreateInput): Promise<Track> {
  if (useLocalMock) {
    return localCreateTrack(input);
  }

  return requestJson<Track>("/api/tracks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function setTrackLike(
  trackId: string,
  liked: boolean,
): Promise<Track> {
  if (useLocalMock) {
    return localSetLike(trackId, liked);
  }

  return requestJson<Track>(`/api/tracks/${trackId}/like`, {
    method: liked ? "POST" : "DELETE",
  });
}

export async function addTimestamp(
  trackId: string,
  time: string,
  body: string,
): Promise<Track> {
  if (useLocalMock) {
    return localAddTimestamp(trackId, { time, body });
  }

  return requestJson<Track>(`/api/tracks/${trackId}/timestamps`, {
    method: "POST",
    body: JSON.stringify({ time, body }),
  });
}

export async function getYoutubeMetadata(
  youtubeUrl: string,
): Promise<YoutubeMetadata> {
  if (useLocalMock) {
    return fetchYoutubeMetadata(youtubeUrl);
  }

  return requestJson<YoutubeMetadata>(
    `/api/youtube/metadata?url=${encodeURIComponent(youtubeUrl)}`,
  );
}
