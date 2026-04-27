import type { DiscordGuild, Env } from "./types";

type GuildRow = {
  guild_id: string;
  name: string;
  icon_url: string | null;
  owner: number;
  permissions: string;
};

function mapGuild(row: GuildRow): DiscordGuild {
  return {
    id: row.guild_id,
    name: row.name,
    iconUrl: row.icon_url,
    owner: Boolean(row.owner),
    permissions: row.permissions,
  };
}

export function discordGuildIconUrl(guildId: string, icon: string | null) {
  if (!icon) {
    return null;
  }
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=128`;
}

export async function listUserGuilds(
  env: Env,
  userId: string,
): Promise<DiscordGuild[]> {
  const rows = await env.DB.prepare(
    `SELECT guild_id, name, icon_url, owner, permissions
       FROM user_guilds
      WHERE user_id = ?
      ORDER BY name COLLATE NOCASE`,
  )
    .bind(userId)
    .all<GuildRow>();

  return rows.results.map(mapGuild);
}

export async function getSelectedGuildId(
  env: Env,
  userId: string,
): Promise<string | null> {
  const row = await env.DB.prepare(
    "SELECT selected_guild_id FROM users WHERE id = ?",
  )
    .bind(userId)
    .first<{ selected_guild_id: string | null }>();

  return row?.selected_guild_id ?? null;
}

export async function replaceUserGuilds(
  env: Env,
  userId: string,
  guilds: DiscordGuild[],
) {
  await env.DB.prepare("DELETE FROM user_guilds WHERE user_id = ?")
    .bind(userId)
    .run();

  for (const guild of guilds) {
    await env.DB.prepare(
      `INSERT INTO user_guilds
        (user_id, guild_id, name, icon_url, owner, permissions, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    )
      .bind(
        userId,
        guild.id,
        guild.name,
        guild.iconUrl,
        guild.owner ? 1 : 0,
        guild.permissions,
      )
      .run();
  }

  const current = await getSelectedGuildId(env, userId);
  const next =
    current && guilds.some((guild) => guild.id === current)
      ? current
      : guilds[0]?.id ?? null;

  await env.DB.prepare("UPDATE users SET selected_guild_id = ? WHERE id = ?")
    .bind(next, userId)
    .run();
}

export async function selectUserGuild(
  env: Env,
  userId: string,
  guildId: string,
) {
  const row = await env.DB.prepare(
    "SELECT 1 AS found FROM user_guilds WHERE user_id = ? AND guild_id = ?",
  )
    .bind(userId, guildId)
    .first<{ found: number }>();

  if (!row) {
    return false;
  }

  await env.DB.prepare("UPDATE users SET selected_guild_id = ? WHERE id = ?")
    .bind(guildId, userId)
    .run();

  return true;
}
