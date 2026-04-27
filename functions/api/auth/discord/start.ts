import {
  OAUTH_STATE_COOKIE,
  setCookie,
} from "../../../_lib/auth";
import { badRequest } from "../../../_lib/http";
import type { Env } from "../../../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DISCORD_CLIENT_ID) {
    return badRequest("DISCORD_CLIENT_ID is not configured.");
  }

  const origin = new URL(request.url).origin;
  const secure = new URL(request.url).protocol === "https:";
  const redirectUri =
    env.DISCORD_REDIRECT_URI || `${origin}/api/auth/discord/callback`;
  const state = crypto.randomUUID();
  const discordUrl = new URL("https://discord.com/oauth2/authorize");
  discordUrl.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
  discordUrl.searchParams.set("redirect_uri", redirectUri);
  discordUrl.searchParams.set("response_type", "code");
  discordUrl.searchParams.set("scope", "identify");
  discordUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: discordUrl.toString(),
      "Set-Cookie": setCookie(OAUTH_STATE_COOKIE, state, {
        maxAge: 600,
        secure,
      }),
    },
  });
};
