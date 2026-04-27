# Discord Music Hub

Discordコミュニティ向けのタグ付き音楽共有Webアプリです。YouTube URLの動画メタデータだけを保存し、再生はYouTube埋め込みで行います。

## Local UI Mock

```bash
npm install
npm run dev
```

Vite開発サーバーでは開発時だけローカルモックを使います。曲追加、検索、タグ絞り込み、いいね、タイムスタンプコメントはブラウザの `localStorage` に保存されます。

本番ビルドでは `localStorage` モックを使わず、Cloudflare Pages Functions APIを呼びます。

## Local Pages Functions + D1

ローカルでCloudflare Pages FunctionsとD1を試す場合は、Gitに含めない `.dev.vars` を作ります。

```bash
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run pages:dev
```

`.dev.vars.example` では `DEV_AUTH=true` を使い、以下の開発ユーザーでログインします。

- `moca_0721`
- roles: `member`, `playlist_editor`

## Production Safety

- `wrangler.jsonc` の `DEV_AUTH` は本番向けに `false` にしています。
- `DISCORD_CLIENT_SECRET` などの秘密情報は `wrangler.jsonc` やGit管理ファイルに書かないでください。
- Cloudflare Pagesの環境変数、またはWrangler secretで設定してください。
- D1 binding名は `DB` にしてください。

## Production D1 Setup

```bash
npx wrangler login
npx wrangler d1 create discord_music_hub
```

コマンド結果に表示される `database_id` を `wrangler.jsonc` の `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID` と置き換えます。

```bash
npm run db:migrate:remote
```

Cloudflare Pages側でもD1 bindingを設定します。

- Binding name: `DB`
- Database: `discord_music_hub`

## Discord OAuth

Discord Developer PortalでOAuth2アプリを作成し、Redirect URIを設定します。

コード上のOAuth callback endpointは、`functions/api/auth/discord/callback.ts` と `functions/api/auth/discord/start.ts` で使っている以下のパスです。

```text
/api/auth/discord/callback
```

`DISCORD_REDIRECT_URI` が未設定の場合、コードはリクエスト元のoriginを使って `${origin}/api/auth/discord/callback` を組み立てます。本番ではDiscord Developer Portalの設定と完全一致させるため、Cloudflare Pagesの環境変数として明示的に設定してください。

Local:

```text
http://localhost:8788/api/auth/discord/callback
```

Production:

```text
https://YOUR_PAGES_DOMAIN/api/auth/discord/callback
```

Cloudflare Pagesの環境変数に以下を設定します。

| Name | Value | Secret | Notes |
| --- | --- | --- | --- |
| `DEV_AUTH` | `false` | No | 本番では必ず `false` |
| `DISCORD_CLIENT_ID` | Discord Developer PortalのClient ID | No | OAuth開始URLで使用 |
| `DISCORD_CLIENT_SECRET` | Discord Developer PortalのClient Secret | Yes | Gitに書かずCloudflare Pages側で設定 |
| `DISCORD_REDIRECT_URI` | `https://YOUR_PAGES_DOMAIN/api/auth/discord/callback` | No | Discord Developer PortalのRedirect URIと完全一致させる |
| `APP_URL` | `https://YOUR_PAGES_DOMAIN` | No | OAuth成功後の戻り先 |

Production Redirect URI:

```text
https://YOUR_PAGES_DOMAIN/api/auth/discord/callback
```

`VITE_USE_LOCAL_MOCK` はローカルVite開発用です。本番Cloudflare Pagesには設定しないでください。

Cloudflare PagesのD1 bindingは環境変数ではありません。PagesのSettingsで以下を設定します。

```text
Binding name: DB
Database: discord_music_hub
```

## Cloudflare Pages Deploy

1. GitHubリポジトリをCloudflare Pagesに接続します。
2. Build commandを設定します。

```text
npm run build
```

3. Build output directoryを設定します。

```text
dist
```

4. 環境変数を設定します。
5. D1 binding `DB` を設定します。
6. デプロイします。

## Post Deploy Smoke Test

- Discord OAuthでログインできる
- `GET /api/me` が現在ユーザーを返す
- 曲を追加できる
- 追加した曲が一覧に出る
- いいねできる
- タイムスタンプコメントを追加できる
- 埋め込み不可、年齢制限、削除済み動画でエラー表示と「YouTubeで開く」が出る
- スマホ幅で一覧、詳細、追加画面が最低限操作できる

詳細な公開前チェックは [docs/DEPLOY_CHECKLIST.md](docs/DEPLOY_CHECKLIST.md) を参照してください。
