import { requireUser } from "../../_lib/auth";
import { getSelectedGuildId } from "../../_lib/guilds";
import { json, notFound, unauthorized } from "../../_lib/http";
import { getTrackById } from "../../_lib/tracks";
import type { Env } from "../../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env).catch(() => null);
  if (!user) {
    return unauthorized();
  }

  const selectedGuildId = await getSelectedGuildId(env, user.id);
  if (!selectedGuildId) {
    return notFound("Track not found.");
  }

  const id = String(params.id);
  const track = await getTrackById(env, id, user.id, selectedGuildId);
  return track ? json(track) : notFound("Track not found.");
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

  const id = String(params.id);
  const row = await env.DB.prepare(
    "SELECT added_by_user_id, guild_id FROM tracks WHERE id = ?",
  )
    .bind(id)
    .first<{ added_by_user_id: string; guild_id: string | null }>();

  if (!row) {
    return notFound("Track not found.");
  }

  const selectedGuildId = await getSelectedGuildId(env, user.id);
  if (
    row.added_by_user_id !== user.id ||
    !selectedGuildId ||
    row.guild_id !== selectedGuildId
  ) {
    return unauthorized();
  }

  await env.DB.prepare("DELETE FROM timestamp_comments WHERE track_id = ?")
    .bind(id)
    .run();
  await env.DB.prepare(
    `DELETE FROM reason_comment_likes
      WHERE comment_id IN (SELECT id FROM reason_comments WHERE track_id = ?)`,
  )
    .bind(id)
    .run();
  await env.DB.prepare("DELETE FROM reason_comments WHERE track_id = ?")
    .bind(id)
    .run();
  await env.DB.prepare("DELETE FROM likes WHERE track_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM track_tags WHERE track_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM tracks WHERE id = ?").bind(id).run();

  return json({ ok: true });
};
