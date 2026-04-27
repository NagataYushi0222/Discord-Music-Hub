import { requireUser } from "../../_lib/auth";
import { json, notFound } from "../../_lib/http";
import { getTrackById } from "../../_lib/tracks";
import type { Env } from "../../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await requireUser(request, env).catch(() => null);
  const id = String(params.id);
  const track = await getTrackById(env, id, user?.id);
  return track ? json(track) : notFound("Track not found.");
};
