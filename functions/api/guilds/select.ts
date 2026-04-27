import { requireUser } from "../../_lib/auth";
import {
  getSelectedGuildId,
  listUserGuilds,
  selectUserGuild,
} from "../../_lib/guilds";
import { badRequest, json, readJson, unauthorized } from "../../_lib/http";
import type { Env } from "../../_lib/types";

type SelectGuildBody = {
  guildId?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env).catch(() => null);
  if (!user) {
    return unauthorized();
  }

  const body = await readJson<SelectGuildBody>(request).catch((error) => error);
  if (body instanceof Error) {
    return badRequest(body.message);
  }

  const guildId = body.guildId?.trim();
  if (!guildId) {
    return badRequest("guildId is required.");
  }

  const selected = await selectUserGuild(env, user.id, guildId);
  if (!selected) {
    return badRequest("Selected guild is not available for this user.");
  }

  const [guilds, selectedGuildId] = await Promise.all([
    listUserGuilds(env, user.id),
    getSelectedGuildId(env, user.id),
  ]);

  return json({ guilds, selectedGuildId });
};
