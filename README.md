# Discord Music Hub

Discordコミュニティ向けのタグ付き音楽共有Webアプリです。YouTube URLの動画メタデータだけを保存し、再生はYouTube埋め込みで行います。

## Local UI Mock

```bash
npm install
npm run dev
```

Vite開発サーバーでは `DEV_AUTH` 相当のローカルモックが使われます。曲追加、検索、タグ絞り込み、いいね、タイムスタンプコメントをブラウザの `localStorage` に保存します。

## Cloudflare Pages Functions + D1

```bash
npm run build
npm run db:migrate:local
npm run pages:dev
```

ローカルのPages Functionsでは `wrangler.jsonc` の `DEV_AUTH=true` により、以下の開発ユーザーでログインします。

- `moca_0721`
- roles: `member`, `playlist_editor`

## Discord OAuth

`.env.example` を参考に環境変数を設定します。

```bash
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:8788/api/auth/discord/callback
APP_URL=http://localhost:8788
```

本番ではCloudflare D1を作成し、`wrangler.jsonc` の `database_id` を実際のIDに置き換えてからマイグレーションを適用してください。
