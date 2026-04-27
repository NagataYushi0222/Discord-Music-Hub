# Coding Instructions

## Product

Build a Discord-community music sharing app called Discord Music Hub.

Users can submit YouTube songs with:
- tags
- recommendation reason
- timestamp comments
- likes
- added-by user
- community stats

## UI References

Use images in the `UI_IMAGE` directory as visual references.

There are two main UI references:
1. Normal playback / browsing screen
2. Add-song / submission screen

Match the layout, spacing, and design direction:
- light theme
- rounded cards
- purple/blue accent color
- clean modern dashboard UI
- Japanese labels
- Discord-community feel

Do not create a sketch style UI. Build a real web app UI.

## Stack

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- Cloudflare Pages
- Cloudflare Pages Functions or Workers
- Cloudflare D1

## Development Rules

- Keep the code simple and readable.
- Use small reusable components.
- Do not over-engineer.
- Build MVP first.
- Do not implement Discord Bot yet.
- Do not implement Spotify yet.
- Do not store YouTube videos or audio.
- Use YouTube embed/player for playback.
- Store only metadata and user-generated text.

## Important Features

### Browse screen

- Track list
- Search bar
- Tag filter
- User filter
- Sort dropdown
- Selected track detail panel
- Timestamp comments
- Bottom player bar

### Add screen

- YouTube URL field
- Auto preview card
- Tag chips
- Suggested tags
- Recommendation reason textarea
- Timestamp rows
- Public/draft option
- Post preview
- Save draft button
- Submit button

## Authentication

Use Discord OAuth2.

For local development, implement DEV_AUTH mode:
- If DEV_AUTH=true, login as a fake user.
- Fake user:
  - id: dev_user
  - username: moca_0721
  - avatar_url: use placeholder
  - roles: member, playlist_editor

## Database

Use Cloudflare D1.

Use migrations under `migrations/`.

## API Style

Use JSON API.

Suggested endpoints:

- GET /api/me
- GET /api/tracks
- POST /api/tracks
- GET /api/tracks/:id
- POST /api/tracks/:id/like
- DELETE /api/tracks/:id/like
- GET /api/tags
- POST /api/tracks/:id/timestamps
- GET /api/youtube/metadata
- GET /api/auth/discord/start
- GET /api/auth/discord/callback
- POST /api/auth/logout

## Acceptance Criteria

The app is acceptable when:

- `npm run dev` starts the app.
- The UI resembles the reference images.
- A user can add a song in DEV_AUTH mode.
- Added songs appear in the list.
- Selecting a song shows its detail panel.
- Tags can filter songs.
- Keyword search works.
- Like button works.
- Timestamp comments are saved and displayed.
- D1 schema is included.
- Environment variable examples are included.