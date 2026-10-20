# Inspo

A personal inspiration library that runs on your Mac and reads the **Inspo** folder in iCloud Drive.

## Start it

```sh
npm install   # first time only
npm start     # builds, then open http://localhost:4321
```

To have it start at login, add a LaunchAgent that runs `node server/index.ts` in this folder with
`NODE_ENV=production` (restart it with `launchctl kickstart -k gui/$(id -u)/<label>` after code changes,
and run `npx vite build` first so the page is up to date).

## How saving works

- **Mac:** drag images, videos or links onto the window, paste with ⌘V, or drop files into the Inspo folder in Finder.
- **iPhone:** Share → Save to Files → iCloud Drive → Inspo. For links, set up the “Save to Inspo” Shortcut
  (steps are in the app under *How to save from anywhere*); it drops links into `Inspo/_inbox`.
- Links are turned into real image/video files: tweets via the public fxtwitter API, other pages via their
  preview image or video. If nothing can be grabbed, the link is kept as a card.

## Shared gallery

The app can publish a read-only copy of the library (images, titles, tags, colours, search; never your
notes) to Cloudflare's free static hosting, so it can be browsed on any phone and shared with a link.

- One-time: `npx wrangler login` (browser sign-in, no keys to copy).
- Then press the refresh button under **Shared gallery** in the sidebar. After that it republishes by
  itself when things have been quiet for 10 minutes, at most every 2 hours.
- Media is copied at full quality. Files over 25 MB (the free plan's per-file limit) are re-encoded:
  images as high-quality JPEG, videos at 1080p or 720p; videos that still don't fit show as a still.
- The free plan allows 20,000 files, roughly 9,000 items. `INSPO_SITE_NAME` changes the site name.

## Where things live

- `Inspo/` in iCloud Drive: your images and videos.
- `Inspo/_library.json`: tags, titles, notes and sources. Syncs with the folder.
- `Inspo/_inbox/`: drop text files with links here; they get saved and cleared.
- `~/Library/Caches/inspo`: thumbnails and the built gallery. Safe to delete.

Set `INSPO_DIR` to use a different folder. `npm run dev` runs a live-reloading version on port 5173.
