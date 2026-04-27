import type { AppUser, Env, UserRow } from "./types";

export const SESSION_COOKIE = "dmh_session";
export const OAUTH_STATE_COOKIE = "dmh_oauth_state";

const devUser: AppUser = {
  id: "dev_user",
  username: "moca_0721",
  avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
  roles: ["member", "playlist_editor"],
};

function parseCookies(request: Request): Map<string, string> {
  const cookie = request.headers.get("Cookie") ?? "";
  return new Map(
    cookie
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [
          part.slice(0, index),
          decodeURIComponent(part.slice(index + 1)),
        ] as const;
      }),
  );
}

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    roles: row.roles.split(",").filter(Boolean),
  };
}

export async function ensureUser(env: Env, user: AppUser) {
  await env.DB.prepare(
    `INSERT INTO users (id, username, avatar_url, roles, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       avatar_url = excluded.avatar_url,
       roles = excluded.roles,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(user.id, user.username, user.avatarUrl, user.roles.join(","))
    .run();
}

export async function getCurrentUser(
  request: Request,
  env: Env,
): Promise<AppUser | null> {
  if (env.DEV_AUTH === "true") {
    await ensureUser(env, devUser);
    return devUser;
  }

  const sessionId = parseCookies(request).get(SESSION_COOKIE);
  if (!sessionId) {
    return null;
  }

  const row = await env.DB.prepare(
    `SELECT users.id, users.username, users.avatar_url, users.roles
       FROM sessions
       JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = ? AND sessions.expires_at > CURRENT_TIMESTAMP`,
  )
    .bind(sessionId)
    .first<UserRow>();

  return row ? mapUser(row) : null;
}

export async function requireUser(request: Request, env: Env): Promise<AppUser> {
  const user = await getCurrentUser(request, env);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
  )
    .bind(sessionId, userId, expiresAt)
    .run();
  return sessionId;
}

export async function deleteSession(request: Request, env: Env) {
  const sessionId = parseCookies(request).get(SESSION_COOKIE);
  if (!sessionId) {
    return;
  }
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

export function getCookie(request: Request, name: string): string | undefined {
  return parseCookies(request).get(name);
}

export function setCookie(
  name: string,
  value: string,
  options: { maxAge?: number; httpOnly?: boolean; secure?: boolean } = {},
) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
  ];
  if (options.secure ?? true) {
    parts.push("Secure");
  }
  if (options.httpOnly ?? true) {
    parts.push("HttpOnly");
  }
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  return parts.join("; ");
}

export function clearCookie(name: string, secure = true) {
  return [
    `${name}=`,
    "Path=/",
    "SameSite=Lax",
    secure ? "Secure" : "",
    "HttpOnly",
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ");
}
