import { requireUser } from "../../../_lib/auth";
import { badRequest, json, notFound, readJson, unauthorized } from "../../../_lib/http";
import { ensureTrackVisible, getTrackById } from "../../../_lib/tracks";
import type { Env } from "../../../_lib/types";

type TimestampBody = {
  time?: string;
  body?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env).catch(() => null);
  if (!user) {
    return unauthorized();
  }

  const trackId = String(params.id);
  if (!(await ensureTrackVisible(env, trackId, user.id))) {
    return notFound("Track not found.");
  }

  const body = await readJson<TimestampBody>(request).catch((error) => error);
  if (body instanceof Error) {
    return badRequest(body.message);
  }
  if (!body.time?.trim() || !body.body?.trim()) {
    return badRequest("Time and body are required.");
  }

  await env.DB.prepare(
    `INSERT INTO timestamp_comments (id, track_id, user_id, time, body)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      `ts_${crypto.randomUUID()}`,
      trackId,
      user.id,
      body.time.trim(),
      body.body.trim(),
    )
    .run();

  return json(await getTrackById(env, trackId, user.id), { status: 201 });
};
