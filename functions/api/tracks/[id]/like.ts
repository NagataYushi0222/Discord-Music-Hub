import { requireUser } from "../../../_lib/auth";
import { getSelectedGuildId } from "../../../_lib/guilds";
import { json, notFound, unauthorized } from "../../../_lib/http";
import { ensureTrackVisible, getTrackById } from "../../../_lib/tracks";
import type { Env } from "../../../_lib/types";

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

  await env.DB.prepare("INSERT OR IGNORE INTO likes (track_id, user_id) VALUES (?, ?)")
    .bind(trackId, user.id)
    .run();

  return json(await getTrackById(env, trackId, user.id, selectedGuildId));
};

export const onRequestDelete: PagesFunction<Env> = async ({
  request,
  env,
  params,
}) => {
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

  await env.DB.prepare("DELETE FROM likes WHERE track_id = ? AND user_id = ?")
    .bind(trackId, user.id)
    .run();

  return json(await getTrackById(env, trackId, user.id, selectedGuildId));
};
