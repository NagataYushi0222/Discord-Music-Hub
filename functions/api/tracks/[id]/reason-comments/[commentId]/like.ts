import { requireUser } from "../../../../../_lib/auth";
import { getSelectedGuildId } from "../../../../../_lib/guilds";
import { json, notFound, unauthorized } from "../../../../../_lib/http";
import { ensureTrackVisible, getTrackById } from "../../../../../_lib/tracks";
import type { Env } from "../../../../../_lib/types";

async function canUseComment(
  env: Env,
  trackId: string,
  commentId: string,
): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT id FROM reason_comments WHERE id = ? AND track_id = ?",
  )
    .bind(commentId, trackId)
    .first<{ id: string }>();
  return Boolean(row);
}

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
  params,
}) => {
  const user = await requireUser(request, env).catch(() => null);
  if (!user) {
    return unauthorized();
  }

  const trackId = String(params.id);
  const commentId = String(params.commentId);
  const selectedGuildId = await getSelectedGuildId(env, user.id);
  if (
    !selectedGuildId ||
    !(await ensureTrackVisible(env, trackId, user.id, selectedGuildId)) ||
    !(await canUseComment(env, trackId, commentId))
  ) {
    return notFound("Comment not found.");
  }

  await env.DB.prepare(
    "INSERT OR IGNORE INTO reason_comment_likes (comment_id, user_id) VALUES (?, ?)",
  )
    .bind(commentId, user.id)
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
  const commentId = String(params.commentId);
  const selectedGuildId = await getSelectedGuildId(env, user.id);
  if (
    !selectedGuildId ||
    !(await ensureTrackVisible(env, trackId, user.id, selectedGuildId)) ||
    !(await canUseComment(env, trackId, commentId))
  ) {
    return notFound("Comment not found.");
  }

  await env.DB.prepare(
    "DELETE FROM reason_comment_likes WHERE comment_id = ? AND user_id = ?",
  )
    .bind(commentId, user.id)
    .run();

  return json(await getTrackById(env, trackId, user.id, selectedGuildId));
};
