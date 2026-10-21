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
  (steps are in the app under _How to save from anywhere_); it drops links into `Inspo/_inbox`.
- Links are turned into real image/video files: tweets via the public fxtwitter API, other pages via their
  preview image or video. If nothing can be grabbed, the link is kept as a card.

## Projects and moodboards

- Press **Select** (or the round tick on a card), pick inspos, then **Add to project** → an existing
  project or **New project…**. An opened inspo also lists its projects, and can be added or taken out.
- A project has two views: **Collected** (its inspos) and **Moodboard**, a ready-made bento of its
  pictures plus colour and type tiles taken from the pictures on the board. With fewer pictures than
  spots, pictures grow to fill the gaps. The panel beside it picks the layout, reorders pictures (drag)
  or leaves them off (click), switches tiles, shuffles the colours, sets gap, corner radius and
  background, shuffles the pictures, and exports a PNG.
- When a project is done, **Archive** it (it moves under _Archived_ in the sidebar) or **Delete** it
  (Undo for a few seconds). Neither touches the inspos themselves.
- Projects are saved in `_library.json`. The shared gallery shows active projects read-only.

## Shared gallery

The app can publish a read-only copy of the library (images, titles, tags, colours, search; never your
notes) to Cloudflare's free static hosting, so it can be browsed on any phone and shared with a link.

- One-time: `npx wrangler login` (browser sign-in, no keys to copy).
- Then press the refresh button under **Shared gallery** in the sidebar. After that it republishes by
  itself when things have been quiet for 10 minutes, at most every 2 hours.
- Media is copied at full quality. Files over 25 MB (the free plan's per-file limit) are re-encoded:
  images as high-quality JPEG, videos at 1080p or 720p; videos that still don't fit show as a still.
- The free plan allows 20,000 files, roughly 9,000 items. `INSPO_SITE_NAME` changes the site name.

## Components

Next to Inspo there is a second app, **Components**: a grid of live, tweakable pieces of interface that
you made. Switch between the two from the wordmark at the top of the sidebar (on phones, the small button
at the left of the top bar). Open one to play with its controls, then press **Copy prompt** (a description
you can paste into any AI chat) or **Copy code** (the finished file, with your current settings built in).
Components also show up in the shared gallery, where they can be tweaked and copied without any password.
New or changed components reach the shared gallery automatically, within the usual delay after the app
restarts, or right away with the refresh button under Shared gallery in Inspo.

**Making a new one:** ask Claude in a chat to build it into `src/library/<slug>/`. Each component is one folder:

- `component.tsx`: the component itself, which is what Copy code hands out.
- `meta.tsx`: its title, description, tags, controls (sliders, colours, toggles, images…) and the prompt text.
  The tags there are where a component starts; change them in the app (they're saved in `Inspo/_library.json`).

**The copy contract.** So the copied code works when pasted into someone else's React or Next.js project,
`component.tsx` must be:

- one self-contained file, starting with `"use client"`, with a default-exported component;
- importing only from `react`, with inline styles or a `<style>` tag (no Tailwind, no other libraries);
- holding its settings in a `const defaults = { … }` block between the `// @inspo-defaults-start` and
  `// @inspo-defaults-end` comments, which Copy code rewrites with the current values.

An image you upload in the controls becomes `/your-image.jpg` in the copied code (the built-in gradient still
shows until you add that file). `npm test` checks every component against all of this.

### Paper Shaders

All 30 shaders from [Paper Shaders](https://shaders.paper.design) (Apache 2.0, by Paper) are in Components as
`src/library/paper-*`. They're generated, not hand-written: `scripts/generate-paper-components.ts` reads the
setting descriptions and ranges from Paper's type files and the defaults and presets from Paper's package. After
upgrading `@paper-design/shaders-react` (it's pinned to an exact version, as Paper asks until their 1.0), run:

```sh
node scripts/generate-paper-components.ts && npx prettier --write "src/library/paper-*"
```

These are the one exception to "imports only react": their copied code imports `@paper-design/shaders-react` and
starts with the exact install line (`npm test` checks the line matches the installed version). Image filters and
logo animations come with sample pictures drawn in code; copied code points them at `/your-image.jpg`.

## Where things live

- `Inspo/` in iCloud Drive: your images and videos.
- `Inspo/_library.json`: tags, titles, notes and sources, plus your tags for Components. Syncs with the folder.
- `Inspo/_inbox/`: drop text files with links here; they get saved and cleared.
- `~/Library/Caches/inspo`: thumbnails and the built gallery. Safe to delete.

Set `INSPO_DIR` to use a different folder. `npm run dev` runs a live-reloading version on port 5173.
