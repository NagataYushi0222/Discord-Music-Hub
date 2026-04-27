import { requireUser } from "../../_lib/auth";
import { json, notFound, unauthorized } from "../../_lib/http";
import { getTrackById } from "../../_lib/tracks";
import type { Env } from "../../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env).catch(() => null);
  const id = String(params.id);
  const track = await getTrackById(env, id, user?.id);
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
    "SELECT added_by_user_id FROM tracks WHERE id = ?",
  )
    .bind(id)
    .first<{ added_by_user_id: string }>();

  if (!row) {
    return notFound("Track not found.");
  }

  if (row.added_by_user_id !== user.id) {
    return unauthorized();
  }

  await env.DB.prepare("DELETE FROM timestamp_comments WHERE track_id = ?")
    .bind(id)
    .run();
  await env.DB.prepare("DELETE FROM likes WHERE track_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM track_tags WHERE track_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM tracks WHERE id = ?").bind(id).run();

  return json({ ok: true });
};
