import { json } from "../_lib/http";
import type { Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const rows = await env.DB.prepare(
    `SELECT tag, COUNT(*) AS count
       FROM track_tags
      GROUP BY tag
      ORDER BY count DESC, tag COLLATE NOCASE ASC`,
  ).all<{ tag: string; count: number }>();

  return json(rows.results);
};
