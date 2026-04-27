import type {
  AppUser,
  Env,
  ReasonComment,
  TimestampComment,
  Track,
  TrackRow,
  UserRow,
} from "./types";

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

async function getReasonComments(
  env: Env,
  trackId: string,
  viewerId?: string,
): Promise<{ comments: ReasonComment[]; count: number }> {
  const rows = await env.DB.prepare(
    `SELECT reason_comments.id,
            reason_comments.parent_comment_id,
            reason_comments.body,
            reason_comments.created_at,
            users.id AS user_id,
            users.username,
            users.avatar_url,
            users.roles,
            (SELECT COUNT(*)
               FROM reason_comment_likes
              WHERE reason_comment_likes.comment_id = reason_comments.id) AS likes,
            (SELECT COUNT(*)
               FROM reason_comment_likes
              WHERE reason_comment_likes.comment_id = reason_comments.id
                AND reason_comment_likes.user_id = ?) AS liked_by_me
       FROM reason_comments
       JOIN users ON users.id = reason_comments.user_id
      WHERE reason_comments.track_id = ?
      ORDER BY reason_comments.created_at ASC`,
  )
    .bind(viewerId ?? "", trackId)
    .all<{
      id: string;
      parent_comment_id: string | null;
      body: string;
      created_at: string;
      user_id: string;
      username: string;
      avatar_url: string;
      roles: string;
      likes: number;
      liked_by_me: number;
    }>();

  const byId = new Map<string, ReasonComment>();
  const roots: ReasonComment[] = [];

  for (const row of rows.results) {
    byId.set(row.id, {
      id: row.id,
      body: row.body,
      user: {
        id: row.user_id,
        username: row.username,
        avatarUrl: row.avatar_url,
        roles: row.roles.split(",").filter(Boolean),
      },
      likes: row.likes,
      likedByMe: Boolean(row.liked_by_me),
      replies: [],
      createdAt: row.created_at,
    });
  }

  for (const row of rows.results) {
    const comment = byId.get(row.id);
    if (!comment) {
      continue;
    }

    if (row.parent_comment_id && byId.has(row.parent_comment_id)) {
      byId.get(row.parent_comment_id)?.replies.push(comment);
    } else {
      roots.push(comment);
    }
  }

  return { comments: roots, count: rows.results.length };
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
  const [tags, timestamps, reasonCommentState, likeState] = await Promise.all([
    getTags(env, row.id),
    getTimestamps(env, row.id),
    getReasonComments(env, row.id, viewerId),
    getLikeState(env, row.id, viewerId),
  ]);

  return {
    id: row.id,
    youtubeUrl: row.youtube_url,
    videoId: row.video_id,
    title: row.title,
    artist: row.artist,
    thumbnailUrl: row.thumbnail_url,
    genre: row.genre ?? "",
    addedBy: mapUser(row),
    tags,
    reason: row.reason,
    reasonComments: reasonCommentState.comments,
    reasonCommentCount: reasonCommentState.count,
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
  viewerId: string,
  guildId: string,
): Promise<Track[]> {
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
        AND tracks.guild_id = ?
      ORDER BY tracks.created_at DESC`,
  )
    .bind(viewerId, guildId)
    .all<TrackRow>();

  return Promise.all(
    rows.results.map((row) => hydrateTrack(env, row, viewerId)),
  );
}

export async function getTrackById(
  env: Env,
  trackId: string,
  viewerId: string,
  guildId: string,
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
        AND tracks.guild_id = ?
        AND (tracks.visibility = 'public' OR tracks.added_by_user_id = ?)`,
  )
    .bind(trackId, guildId, viewerId)
    .first<TrackRow>();

  return row ? hydrateTrack(env, row, viewerId) : null;
}

export async function ensureTrackVisible(
  env: Env,
  trackId: string,
  viewerId: string,
  guildId: string,
): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT id FROM tracks
      WHERE id = ?
        AND guild_id = ?
        AND (visibility = 'public' OR added_by_user_id = ?)`,
  )
    .bind(trackId, guildId, viewerId)
    .first<{ id: string }>();
  return Boolean(row);
}
