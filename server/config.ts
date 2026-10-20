import os from "node:os"
import path from "node:path"

const ICLOUD_DRIVE = path.join(
  os.homedir(),
  "Library/Mobile Documents/com~apple~CloudDocs"
)

// The folder everything lives in. Override with INSPO_DIR to point elsewhere.
export const INSPO_DIR = path.resolve(
  process.env.INSPO_DIR ?? path.join(ICLOUD_DRIVE, "Inspo")
)

// Tags, titles and notes. Lives inside the folder so it syncs with it.
export const LIBRARY_FILE = path.join(INSPO_DIR, "_library.json")

// Drop text files containing links here (e.g. from an iPhone Shortcut).
export const INBOX_DIR = path.join(INSPO_DIR, "_inbox")

// Thumbnails and other throwaway files. Kept out of iCloud on purpose.
export const CACHE_DIR = path.join(os.homedir(), "Library/Caches/inspo")
export const TMP_DIR = path.join(CACHE_DIR, "tmp")
export const THUMB_DIR = path.join(CACHE_DIR, "thumbs")

export const PORT = Number(process.env.PORT ?? 4321)
export const IS_PROD = process.env.NODE_ENV === "production"
