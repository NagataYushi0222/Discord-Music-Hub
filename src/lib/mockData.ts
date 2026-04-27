import type { AppUser, DiscordGuild, Track } from "../types";

export const devUser: AppUser = {
  id: "dev_user",
  username: "moca_0721",
  avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
  roles: ["member", "playlist_editor"],
};

export const seedGuilds: DiscordGuild[] = [
  {
    id: "guild_design_lab",
    name: "Design Lab",
    iconUrl: null,
    owner: true,
    permissions: "8",
  },
  {
    id: "guild_server_2",
    name: "Server 2",
    iconUrl: null,
    owner: false,
    permissions: "0",
  },
];

const users: AppUser[] = [
  devUser,
  {
    id: "u_sorano",
    username: "sorano_39",
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
    roles: ["member"],
  },
  {
    id: "u_haru",
    username: "haru_2525",
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/2.png",
    roles: ["member"],
  },
  {
    id: "u_yuzu",
    username: "yuzu_88",
    avatarUrl: "https://cdn.discordapp.com/embed/avatars/3.png",
    roles: ["member"],
  },
];

export const seedTracks: Track[] = [
  {
    id: "seed_yoru",
    youtubeUrl: "https://www.youtube.com/watch?v=x8VYWazR5mE",
    videoId: "x8VYWazR5mE",
    title: "夜に駆ける",
    artist: "YOASOBI",
    thumbnailUrl: "https://img.youtube.com/vi/x8VYWazR5mE/hqdefault.jpg",
    addedBy: users[0],
    tags: ["青春", "夜", "通学"],
    reason:
      "イントロから一気に世界観に引き込まれます。切ない歌詞と疾走感のあるメロディが、夜の帰り道やふと考え事をしてしまう瞬間にぴったり。",
    timestamps: [
      {
        id: "ts_yoru_1",
        time: "0:42",
        body: "ここのメロディが一番好き。鳥肌立つ",
        user: users[0],
        createdAt: "2026-04-20T08:00:00.000Z",
      },
      {
        id: "ts_yoru_2",
        time: "1:21",
        body: "サビ前の盛り上がりが最高！",
        user: users[2],
        createdAt: "2026-04-20T08:05:00.000Z",
      },
      {
        id: "ts_yoru_3",
        time: "2:10",
        body: "ラスサビの開放感がやばい",
        user: users[1],
        createdAt: "2026-04-20T08:10:00.000Z",
      },
    ],
    likes: 128,
    likedByMe: true,
    views: 12400,
    visibility: "public",
    createdAt: "2026-04-20T07:50:00.000Z",
  },
  {
    id: "seed_suiheisen",
    youtubeUrl: "https://www.youtube.com/watch?v=iqEr3P78fz8",
    videoId: "iqEr3P78fz8",
    title: "水平線",
    artist: "back number",
    thumbnailUrl: "https://img.youtube.com/vi/iqEr3P78fz8/hqdefault.jpg",
    addedBy: users[1],
    tags: ["ドライブ", "海", "エモい"],
    reason:
      "海沿いを走るときに流したくなる曲。落ち着いた温度感のまま、気持ちをそっと前へ押してくれます。",
    timestamps: [
      {
        id: "ts_sui_1",
        time: "1:08",
        body: "ここから景色が広がる感じがする",
        user: users[1],
        createdAt: "2026-04-21T09:10:00.000Z",
      },
    ],
    likes: 89,
    likedByMe: false,
    views: 8700,
    visibility: "public",
    createdAt: "2026-04-21T09:00:00.000Z",
  },
  {
    id: "seed_kaiju",
    youtubeUrl: "https://www.youtube.com/watch?v=UM9XNpgrqVk",
    videoId: "UM9XNpgrqVk",
    title: "怪獣の花唄",
    artist: "Vaundy",
    thumbnailUrl: "https://img.youtube.com/vi/UM9XNpgrqVk/hqdefault.jpg",
    addedBy: users[2],
    tags: ["作業用", "落ち着く", "夜"],
    reason:
      "作業のテンポを崩さずに気分を上げてくれる一曲。声の抜け感が心地よくて、夜の集中時間に合います。",
    timestamps: [
      {
        id: "ts_kai_1",
        time: "0:58",
        body: "歌い出しの空気が好き",
        user: users[2],
        createdAt: "2026-04-22T11:00:00.000Z",
      },
    ],
    likes: 76,
    likedByMe: false,
    views: 6100,
    visibility: "public",
    createdAt: "2026-04-22T10:40:00.000Z",
  },
  {
    id: "seed_hikari",
    youtubeUrl: "https://www.youtube.com/watch?v=29t3pJd75XU",
    videoId: "29t3pJd75XU",
    title: "光の中へ",
    artist: "結束バンド",
    thumbnailUrl: "https://img.youtube.com/vi/29t3pJd75XU/hqdefault.jpg",
    addedBy: users[3],
    tags: ["希望", "朝", "元気が出る"],
    reason:
      "一日の始まりに聴くと背筋が伸びます。明るいのに軽すぎず、少し勇気がほしいときにちょうどいい。",
    timestamps: [],
    likes: 64,
    likedByMe: false,
    views: 5200,
    visibility: "public",
    createdAt: "2026-04-23T12:00:00.000Z",
  },
];

export const suggestedTags = [
  "青春",
  "夜",
  "通学",
  "作業用",
  "ドライブ",
  "エモい",
  "落ち着く",
  "朝",
  "元気が出る",
  "海",
  "希望",
  "泣ける",
];
