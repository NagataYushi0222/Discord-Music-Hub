/// <reference types="@cloudflare/workers-types" />

export type Env = {
  DB: D1Database;
  DEV_AUTH?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_REDIRECT_URI?: string;
  APP_URL?: string;
};

export type DiscordGuild = {
  id: string;
  name: string;
  iconUrl: string | null;
  owner: boolean;
  permissions: string;
};

export type AppUser = {
  id: string;
  username: string;
  avatarUrl: string;
  roles: string[];
};

export type TimestampComment = {
  id: string;
  time: string;
  body: string;
  user: AppUser;
  createdAt: string;
};

export type ReasonComment = {
  id: string;
  body: string;
  user: AppUser;
  likes: number;
  likedByMe: boolean;
  replies: ReasonComment[];
  createdAt: string;
};

export type Track = {
  id: string;
  youtubeUrl: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  genre: string;
  addedBy: AppUser;
  tags: string[];
  reason: string;
  reasonComments: ReasonComment[];
  reasonCommentCount: number;
  timestamps: TimestampComment[];
  likes: number;
  likedByMe: boolean;
  views: number;
  visibility: "public" | "draft";
  createdAt: string;
};

export type UserRow = {
  id: string;
  username: string;
  avatar_url: string;
  roles: string;
  selected_guild_id?: string | null;
};

export type TrackRow = {
  id: string;
  youtube_url: string;
  video_id: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  genre?: string | null;
  guild_id?: string | null;
  added_by_user_id: string;
  reason: string;
  visibility: "public" | "draft";
  views: number;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string;
  roles: string;
};
