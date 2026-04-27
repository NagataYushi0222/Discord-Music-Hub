import { requireUser } from "../_lib/auth";
import { getSelectedGuildId } from "../_lib/guilds";
import { badRequest, json, unauthorized } from "../_lib/http";
import type { Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env).catch(() => null);
  if (!user) {
    return unauthorized();
  }

  const selectedGuildId = await getSelectedGuildId(env, user.id);
  if (!selectedGuildId) {
    return badRequest("Discord server must be selected.");
  }

  const rows = await env.DB.prepare(
    `SELECT tag, COUNT(*) AS count
       FROM track_tags
       JOIN tracks ON tracks.id = track_tags.track_id
      WHERE tracks.guild_id = ?
        AND (tracks.visibility = 'public' OR tracks.added_by_user_id = ?)
      GROUP BY tag
      ORDER BY count DESC, tag COLLATE NOCASE ASC`,
  )
    .bind(selectedGuildId, user.id)
    .all<{ tag: string; count: number }>();

  return json(rows.results);
};
