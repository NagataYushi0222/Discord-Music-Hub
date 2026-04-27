# Deploy Checklist

## Required Production Settings

Production bindings and environment values:

- [ ] `DEV_AUTH=false` is provided by `wrangler.jsonc` `vars`
- [ ] `DEV_AUTH` is not duplicated as a Cloudflare Pages Secret
- [ ] `DISCORD_CLIENT_ID` is set
- [ ] `DISCORD_CLIENT_SECRET` is set as a secret and is not committed
- [ ] `DISCORD_REDIRECT_URI=https://discord-music-hub.pages.dev/api/auth/discord/callback`
- [ ] `APP_URL=https://discord-music-hub.pages.dev`
- [ ] `VITE_USE_LOCAL_MOCK` is not set in production

Discord Developer Portal Redirect URI:

```text
https://discord-music-hub.pages.dev/api/auth/discord/callback
```

D1 binding:

- [ ] Binding name is exactly `DB`
- [ ] Bound database is `discord_music_hub`

## Final Checks

- [ ] `npm run build` が通る
- [ ] `npm run pages:dev` が通る
- [ ] 本番D1マイグレーション済み
- [ ] `DEV_AUTH=false`
- [ ] Discord OAuthログイン成功
- [ ] 曲追加成功
- [ ] いいね成功
- [ ] タイムスタンプ追加成功
- [ ] 埋め込み不可動画のエラー表示
- [ ] スマホ表示の最低限確認
- [ ] 秘密情報がGitHubに含まれていない
