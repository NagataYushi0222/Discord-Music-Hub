import { requireUser } from "../../../_lib/auth";
import { getSelectedGuildId } from "../../../_lib/guilds";
import { badRequest, json, notFound, readJson, unauthorized } from "../../../_lib/http";
import { ensureTrackVisible, getTrackById } from "../../../_lib/tracks";
import type { Env } from "../../../_lib/types";
import { validateTimestamp } from "../../../_lib/validation";

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
  const selectedGuildId = await getSelectedGuildId(env, user.id);
  if (
    !selectedGuildId ||
    !(await ensureTrackVisible(env, trackId, user.id, selectedGuildId))
  ) {
    return notFound("Track not found.");
  }

  const body = await readJson<TimestampBody>(request).catch((error) => error);
  if (body instanceof Error) {
    return badRequest(body.message);
  }
  const timestamp = validateTimestamp(body);
  if (!timestamp.ok) {
    return badRequest(timestamp.error);
  }

  await env.DB.prepare(
    `INSERT INTO timestamp_comments (id, track_id, user_id, time, body)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      `ts_${crypto.randomUUID()}`,
      trackId,
      user.id,
      timestamp.value.time,
      timestamp.value.body,
    )
    .run();

  return json(await getTrackById(env, trackId, user.id, selectedGuildId), { status: 201 });
};
