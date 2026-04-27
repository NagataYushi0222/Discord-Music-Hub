import { requireUser } from "../../../../_lib/auth";
import { getSelectedGuildId } from "../../../../_lib/guilds";
import {
  badRequest,
  json,
  notFound,
  readJson,
  unauthorized,
} from "../../../../_lib/http";
import { ensureTrackVisible, getTrackById } from "../../../../_lib/tracks";
import type { Env } from "../../../../_lib/types";
import { validateReasonCommentBody } from "../../../../_lib/validation";

type CommentBody = {
  body?: string;
  parentCommentId?: string | null;
};

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
  const selectedGuildId = await getSelectedGuildId(env, user.id);
  if (
    !selectedGuildId ||
    !(await ensureTrackVisible(env, trackId, user.id, selectedGuildId))
  ) {
    return notFound("Track not found.");
  }

  const body = await readJson<CommentBody>(request).catch((error) => error);
  if (body instanceof Error) {
    return badRequest(body.message);
  }

  const commentBody = validateReasonCommentBody(body.body);
  if (!commentBody.ok) {
    return badRequest(commentBody.error);
  }

  const parentCommentId = body.parentCommentId?.trim() || null;
  if (parentCommentId) {
    const parent = await env.DB.prepare(
      "SELECT id FROM reason_comments WHERE id = ? AND track_id = ?",
    )
      .bind(parentCommentId, trackId)
      .first<{ id: string }>();
    if (!parent) {
      return badRequest("Parent comment does not exist.");
    }
  }

  await env.DB.prepare(
    `INSERT INTO reason_comments (id, track_id, parent_comment_id, user_id, body)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      `rc_${crypto.randomUUID()}`,
      trackId,
      parentCommentId,
      user.id,
      commentBody.value,
    )
    .run();

  return json(await getTrackById(env, trackId, user.id, selectedGuildId), {
    status: 201,
  });
};
