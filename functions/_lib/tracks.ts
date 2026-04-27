import type { AppUser, Env, TimestampComment, Track, TrackRow, UserRow } from "./types";

function mapUser(row: UserRow | TrackRow): AppUser {
  return {
    id: "user_id" in row ? row.user_id : row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    roles: row.roles.split(",").filter(Boolean),
  };
}

async function getTags(env: Env, trackId: string): Promise<string[]> {
  const rows = await env.DB.prepare(
    "SELECT tag FROM track_tags WHERE track_id = ? ORDER BY tag COLLATE NOCASE",
  )
    .bind(trackId)
    .all<{ tag: string }>();
  return rows.results.map((row) => row.tag);
}

async function getTimestamps(
  env: Env,
  trackId: string,
): Promise<TimestampComment[]> {
  const rows = await env.DB.prepare(
    `SELECT timestamp_comments.id,
            timestamp_comments.time,
            timestamp_comments.body,
            timestamp_comments.created_at,
            users.id AS user_id,
            users.username,
            users.avatar_url,
            users.roles
       FROM timestamp_comments
       JOIN users ON users.id = timestamp_comments.user_id
      WHERE timestamp_comments.track_id = ?
      ORDER BY timestamp_comments.created_at ASC`,
  )
    .bind(trackId)
    .all<{
      id: string;
      time: string;
      body: string;
      created_at: string;
      user_id: string;
      username: string;
      avatar_url: string;
      roles: string;
    }>();

  return rows.results.map((row) => ({
    id: row.id,
    time: row.time,
    body: row.body,
    user: {
      id: row.user_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      roles: row.roles.split(",").filter(Boolean),
    },
    createdAt: row.created_at,
  }));
}

async function getLikeState(env: Env, trackId: string, viewerId?: string) {
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM likes WHERE track_id = ?",
  )
    .bind(trackId)
    .first<{ count: number }>();

  let likedByMe = false;
  if (viewerId) {
    const liked = await env.DB.prepare(
      "SELECT 1 AS liked FROM likes WHERE track_id = ? AND user_id = ?",
    )
      .bind(trackId, viewerId)
      .first<{ liked: number }>();
    likedByMe = Boolean(liked);
  }

  return { likes: count?.count ?? 0, likedByMe };
}

async function hydrateTrack(
  env: Env,
  row: TrackRow,
  viewerId?: string,
): Promise<Track> {
  const [tags, timestamps, likeState] = await Promise.all([
    getTags(env, row.id),
    getTimestamps(env, row.id),
    getLikeState(env, row.id, viewerId),
  ]);

  return {
    id: row.id,
    youtubeUrl: row.youtube_url,
    videoId: row.video_id,
    title: row.title,
    artist: row.artist,
    thumbnailUrl: row.thumbnail_url,
    addedBy: mapUser(row),
    tags,
    reason: row.reason,
    timestamps,
    likes: likeState.likes,
    likedByMe: likeState.likedByMe,
    views: row.views,
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

export async function listTracks(
  env: Env,
  viewerId?: string,
  guildId?: string | null,
): Promise<Track[]> {
  const guildFilter = guildId
    ? "AND tracks.guild_id = ?"
    : "";
  const params = guildId ? [viewerId ?? "", guildId] : [viewerId ?? ""];
  const rows = await env.DB.prepare(
    `SELECT tracks.*,
            users.id AS user_id,
            users.username,
            users.avatar_url,
            users.roles
       FROM tracks
       JOIN users ON users.id = tracks.added_by_user_id
      WHERE (tracks.visibility = 'public'
         OR tracks.added_by_user_id = ?)
      ${guildFilter}
      ORDER BY tracks.created_at DESC`,
  )
    .bind(...params)
    .all<TrackRow>();

  return Promise.all(
    rows.results.map((row) => hydrateTrack(env, row, viewerId)),
  );
}

export async function getTrackById(
  env: Env,
  trackId: string,
  viewerId?: string,
): Promise<Track | null> {
  const row = await env.DB.prepare(
    `SELECT tracks.*,
            users.id AS user_id,
            users.username,
            users.avatar_url,
            users.roles
       FROM tracks
       JOIN users ON users.id = tracks.added_by_user_id
      WHERE tracks.id = ?
        AND (tracks.visibility = 'public' OR tracks.added_by_user_id = ?)`,
  )
    .bind(trackId, viewerId ?? "")
    .first<TrackRow>();

  return row ? hydrateTrack(env, row, viewerId) : null;
}

export async function ensureTrackVisible(
  env: Env,
  trackId: string,
  viewerId?: string,
): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT id FROM tracks
      WHERE id = ?
        AND (visibility = 'public' OR added_by_user_id = ?)`,
  )
    .bind(trackId, viewerId ?? "")
    .first<{ id: string }>();
  return Boolean(row);
}
