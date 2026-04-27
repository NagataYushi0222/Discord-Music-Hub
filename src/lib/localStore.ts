import type {
  AppUser,
  Track,
  TrackCreateInput,
  TimestampComment,
} from "../types";
import { devUser, seedTracks } from "./mockData";

const TRACKS_KEY = "discord_music_hub_tracks_v1";

function cloneTracks(tracks: Track[]): Track[] {
  return JSON.parse(JSON.stringify(tracks)) as Track[];
}

function readTracks(): Track[] {
  const saved = window.localStorage.getItem(TRACKS_KEY);
  if (!saved) {
    const initial = cloneTracks(seedTracks);
    window.localStorage.setItem(TRACKS_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(saved) as Track[];
  } catch {
    const initial = cloneTracks(seedTracks);
    window.localStorage.setItem(TRACKS_KEY, JSON.stringify(initial));
    return initial;
  }
}

function writeTracks(tracks: Track[]) {
  window.localStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
}

export async function localGetMe(): Promise<AppUser> {
  return devUser;
}

export async function localListTracks(): Promise<Track[]> {
  return readTracks().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function localCreateTrack(input: TrackCreateInput): Promise<Track> {
  const tracks = readTracks();
  const timestampComments: TimestampComment[] = input.timestamps
    .filter((timestamp) => timestamp.time.trim() && timestamp.body.trim())
    .map((timestamp, index) => ({
      id: `local_ts_${Date.now()}_${index}`,
      time: timestamp.time.trim(),
      body: timestamp.body.trim(),
      user: devUser,
      createdAt: new Date().toISOString(),
    }));

  const track: Track = {
    id: `local_track_${Date.now()}`,
    youtubeUrl: input.youtubeUrl,
    videoId: input.videoId,
    title: input.title,
    artist: input.artist,
    thumbnailUrl: input.thumbnailUrl,
    addedBy: devUser,
    tags: input.tags,
    reason: input.reason,
    timestamps: timestampComments,
    likes: 0,
    likedByMe: false,
    views: 0,
    visibility: input.visibility,
    createdAt: new Date().toISOString(),
  };

  writeTracks([track, ...tracks]);
  return track;
}

export async function localSetLike(
  trackId: string,
  liked: boolean,
): Promise<Track> {
  const tracks = readTracks();
  const index = tracks.findIndex((track) => track.id === trackId);
  if (index < 0) {
    throw new Error("曲が見つかりません。");
  }

  const track = tracks[index];
  const changed = track.likedByMe !== liked;
  const nextTrack = {
    ...track,
    likedByMe: liked,
    likes: changed ? track.likes + (liked ? 1 : -1) : track.likes,
  };
  tracks[index] = nextTrack;
  writeTracks(tracks);
  return nextTrack;
}

export async function localAddTimestamp(
  trackId: string,
  timestamp: { time: string; body: string },
): Promise<Track> {
  const tracks = readTracks();
  const index = tracks.findIndex((track) => track.id === trackId);
  if (index < 0) {
    throw new Error("曲が見つかりません。");
  }

  const nextTrack = {
    ...tracks[index],
    timestamps: [
      ...tracks[index].timestamps,
      {
        id: `local_ts_${Date.now()}`,
        time: timestamp.time.trim(),
        body: timestamp.body.trim(),
        user: devUser,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  tracks[index] = nextTrack;
  writeTracks(tracks);
  return nextTrack;
}
