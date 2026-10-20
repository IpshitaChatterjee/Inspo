# Inspo

A personal inspiration library that runs on your Mac and reads the **Inspo** folder in iCloud Drive.

## Start it

```sh
npm install   # first time only
npm start     # then open http://localhost:4321
```

## How saving works

- **Mac:** drag images, videos or links onto the window, paste with ⌘V, or drop files into the Inspo folder in Finder.
- **iPhone:** Share → Save to Files → iCloud Drive → Inspo. For links, set up the “Save to Inspo” Shortcut
  (steps are in the app under *How to save from anywhere*); it drops links into `Inspo/_inbox`.
- Links are turned into real image/video files: tweets via the public fxtwitter API, other pages via their
  preview image or video. If nothing can be grabbed, the link is kept as a card.

## Where things live

- `Inspo/` in iCloud Drive: your images and videos.
- `Inspo/_library.json`: tags, titles, notes and sources. Syncs with the folder.
- `Inspo/_inbox/`: drop text files with links here; they get saved and cleared.
- `~/Library/Caches/inspo`: thumbnails. Safe to delete.

Set `INSPO_DIR` to use a different folder. `npm run dev` runs a live-reloading version on port 5173.
