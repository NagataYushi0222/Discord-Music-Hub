import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  createSession,
  ensureUser,
  getCookie,
  setCookie,
} from "../../../_lib/auth";
import { badRequest } from "../../../_lib/http";
import type { AppUser, Env } from "../../../_lib/types";

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
};

type DiscordUserResponse = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

function avatarUrl(user: DiscordUserResponse) {
  if (!user.avatar) {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
    return badRequest("Discord OAuth is not configured.");
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const storedState = getCookie(request, OAUTH_STATE_COOKIE);
  if (!code || !state || !storedState || state !== storedState) {
    return badRequest("Invalid OAuth state.");
  }

  const origin = requestUrl.origin;
  const redirectUri =
    env.DISCORD_REDIRECT_URI || `${origin}/api/auth/discord/callback`;

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return badRequest("Discord token exchange failed.");
  }

  const token = (await tokenResponse.json()) as DiscordTokenResponse;
  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `${token.token_type} ${token.access_token}` },
  });

  if (!userResponse.ok) {
    return badRequest("Discord user fetch failed.");
  }

  const discordUser = (await userResponse.json()) as DiscordUserResponse;
  const secure = requestUrl.protocol === "https:";
  const user: AppUser = {
    id: discordUser.id,
    username: discordUser.global_name || discordUser.username,
    avatarUrl: avatarUrl(discordUser),
    roles: ["member"],
  };

  await ensureUser(env, user);
  const sessionId = await createSession(env, user.id);
  const appUrl = env.APP_URL || "/";
  const headers = new Headers({ Location: appUrl });
  headers.append(
    "Set-Cookie",
    setCookie(SESSION_COOKIE, sessionId, {
      maxAge: 60 * 60 * 24 * 30,
      secure,
    }),
  );
  headers.append(
    "Set-Cookie",
    setCookie(OAUTH_STATE_COOKIE, "", { maxAge: 0, secure }),
  );

  return new Response(null, {
    status: 302,
    headers,
  });
};
