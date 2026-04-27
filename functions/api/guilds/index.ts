import { requireUser } from "../../_lib/auth";
import { getSelectedGuildId, listUserGuilds } from "../../_lib/guilds";
import { json, unauthorized } from "../../_lib/http";
import type { Env } from "../../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env).catch(() => null);
  if (!user) {
    return unauthorized();
  }

  const [guilds, selectedGuildId] = await Promise.all([
    listUserGuilds(env, user.id),
    getSelectedGuildId(env, user.id),
  ]);

  return json({ guilds, selectedGuildId });
};
