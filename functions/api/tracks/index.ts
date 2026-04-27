import { ensureUser, requireUser } from "../../_lib/auth";
import { badRequest, json, readJson, unauthorized } from "../../_lib/http";
import { getTrackById, listTracks } from "../../_lib/tracks";
import type { Env } from "../../_lib/types";
import { extractYouTubeVideoId, fetchYoutubeMetadata } from "../../_lib/youtube";
import {
  validateReason,
  validateTags,
  validateTimestamps,
  validateVisibility,
} from "../../_lib/validation";

type CreateTrackBody = {
  youtubeUrl?: string;
  videoId?: string;
  title?: string;
  artist?: string;
  thumbnailUrl?: string;
  tags?: string[];
  reason?: string;
  timestamps?: { time: string; body: string }[];
  visibility?: "public" | "draft";
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env).catch(() => null);
  const tracks = await listTracks(env, user?.id);
  return json(tracks);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env).catch(() => null);
  if (!user) {
    return unauthorized();
  }

  const body = await readJson<CreateTrackBody>(request).catch((error) => error);
  if (body instanceof Error) {
    return badRequest(body.message);
  }

  if (!body.youtubeUrl) {
    return badRequest("YouTube URL is required.");
  }

  const extractedVideoId = extractYouTubeVideoId(body.youtubeUrl);
  if (!extractedVideoId) {
    return badRequest("Invalid YouTube URL.");
  }

  const reason = validateReason(body.reason);
  if (!reason.ok) {
    return badRequest(reason.error);
  }

  const tags = validateTags(body.tags);
  if (!tags.ok) {
    return badRequest(tags.error);
  }

  const timestamps = validateTimestamps(body.timestamps);
  if (!timestamps.ok) {
    return badRequest(timestamps.error);
  }

  const visibility = validateVisibility(body.visibility);
  if (!visibility.ok) {
    return badRequest(visibility.error);
  }

  const metadata =
    body.title && body.artist && body.thumbnailUrl
      ? {
          videoId: body.videoId || extractedVideoId,
          title: body.title,
          authorName: body.artist,
          thumbnailUrl: body.thumbnailUrl,
        }
      : await fetchYoutubeMetadata(body.youtubeUrl);

  const id = `track_${crypto.randomUUID()}`;

  await ensureUser(env, user);
  await env.DB.prepare(
    `INSERT INTO tracks
      (id, youtube_url, video_id, title, artist, thumbnail_url, added_by_user_id, reason, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      body.youtubeUrl,
      extractedVideoId,
      metadata.title,
      metadata.authorName,
      metadata.thumbnailUrl,
      user.id,
      reason.value,
      visibility.value,
    )
    .run();

  for (const tag of tags.value) {
    await env.DB.prepare("INSERT OR IGNORE INTO track_tags (track_id, tag) VALUES (?, ?)")
      .bind(id, tag)
      .run();
  }

  for (const timestamp of timestamps.value) {
    await env.DB.prepare(
      `INSERT INTO timestamp_comments (id, track_id, user_id, time, body)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        `ts_${crypto.randomUUID()}`,
        id,
        user.id,
        timestamp.time,
        timestamp.body,
      )
      .run();
  }

  const created = await getTrackById(env, id, user.id);
  return json(created, { status: 201 });
};
