ALTER TABLE users ADD COLUMN selected_guild_id TEXT;

ALTER TABLE tracks ADD COLUMN guild_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tracks_guild_id ON tracks(guild_id);

CREATE TABLE IF NOT EXISTS user_guilds (
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT,
  owner INTEGER NOT NULL DEFAULT 0,
  permissions TEXT NOT NULL DEFAULT '0',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, guild_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_guilds_user ON user_guilds(user_id);
