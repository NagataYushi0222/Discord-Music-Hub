import { ensureUser, requireUser } from "../../_lib/auth";
import { badRequest, json, readJson, unauthorized } from "../../_lib/http";
import { getTrackById, listTracks } from "../../_lib/tracks";
import type { Env } from "../../_lib/types";
import { extractYouTubeVideoId, fetchYoutubeMetadata } from "../../_lib/youtube";

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

  if (!body.youtubeUrl || !body.reason?.trim()) {
    return badRequest("YouTube URL and reason are required.");
  }

  const extractedVideoId = extractYouTubeVideoId(body.youtubeUrl);
  if (!extractedVideoId) {
    return badRequest("Invalid YouTube URL.");
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
  const tags = Array.from(
    new Set((body.tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
  ).slice(0, 12);
  const visibility = body.visibility === "draft" ? "draft" : "public";

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
      body.reason.trim(),
      visibility,
    )
    .run();

  for (const tag of tags) {
    await env.DB.prepare("INSERT OR IGNORE INTO track_tags (track_id, tag) VALUES (?, ?)")
      .bind(id, tag)
      .run();
  }

  for (const timestamp of body.timestamps ?? []) {
    if (!timestamp.time.trim() || !timestamp.body.trim()) {
      continue;
    }
    await env.DB.prepare(
      `INSERT INTO timestamp_comments (id, track_id, user_id, time, body)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        `ts_${crypto.randomUUID()}`,
        id,
        user.id,
        timestamp.time.trim(),
        timestamp.body.trim(),
      )
      .run();
  }

  const created = await getTrackById(env, id, user.id);
  return json(created, { status: 201 });
};
