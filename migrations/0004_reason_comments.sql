CREATE TABLE IF NOT EXISTS reason_comments (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  parent_comment_id TEXT,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES reason_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reason_comments_track
  ON reason_comments(track_id, created_at);

CREATE INDEX IF NOT EXISTS idx_reason_comments_parent
  ON reason_comments(parent_comment_id, created_at);

CREATE TABLE IF NOT EXISTS reason_comment_likes (
  comment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, user_id),
  FOREIGN KEY (comment_id) REFERENCES reason_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
