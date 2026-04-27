export type Visibility = "public" | "draft";

export type AppUser = {
  id: string;
  username: string;
  avatarUrl: string;
  roles: string[];
};

export type DiscordGuild = {
  id: string;
  name: string;
  iconUrl: string | null;
  owner: boolean;
  permissions: string;
};

export type GuildSelection = {
  guilds: DiscordGuild[];
  selectedGuildId: string | null;
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
  visibility: Visibility;
  createdAt: string;
};

export type DraftTimestamp = {
  time: string;
  body: string;
};

export type TrackCreateInput = {
  youtubeUrl: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  genre: string;
  tags: string[];
  reason: string;
  timestamps: DraftTimestamp[];
  visibility: Visibility;
};

export type YoutubeMetadata = {
  videoId: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
};
