import { EventEmitter } from "node:events"
import fsp from "node:fs/promises"
import path from "node:path"

import { CACHE_DIR } from "./config.ts"
import { getFile, listItems, type Item } from "./library.ts"
import { mediaFile, VIDEO_EXTS } from "./media.ts"
import { ensureDownloaded, errorMessage, exists, hash, run } from "./util.ts"

// Publishes a read-only copy of the library to Cloudflare, so it can be
// browsed from any phone or shared with a link. The copy is built here on the
// Mac: the gallery version of the app, a data.json, and the media files.
// Media file names are based on content, so each publish only uploads what's new.

const ROOT = path.resolve(import.meta.dirname, "..")
// Run the tools with this same Node, so it works however the app was started.
const VITE = path.join(ROOT, "node_modules/vite/bin/vite.js")
const WRANGLER = path.join(ROOT, "node_modules/wrangler/bin/wrangler.js")
const SITE_DIR = path.join(CACHE_DIR, "site")
const MEDIA_DIR = path.join(SITE_DIR, "m")
const BUILD_DIR = path.join(CACHE_DIR, "gallery-build")
const STATE_FILE = path.join(CACHE_DIR, "publish.json")

const PROJECT = process.env.INSPO_SITE_NAME ?? "inspo"
// Cloudflare's free plan: 25 MiB per file, 20,000 files per site.
const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_FILES = 19_500
// Publish once things have been quiet for a while, and not too often
// (the free plan allows about 500 updates a month).
const QUIET_MS = 10 * 60_000
const MIN_GAP_MS = 2 * 60 * 60_000

const BROWSER_IMAGES = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"])
const BROWSER_VIDEOS = new Set(["mp4", "m4v", "webm", "mov"])

export type PublishState = {
  status: "idle" | "publishing" | "error"
  url?: string
  publishedAt?: string
  items?: number
  error?: string
  pending?: boolean
  signature?: string
}

export const publishEvents = new EventEmitter()

let state: PublishState = { status: "idle" }
let timer: NodeJS.Timeout | null = null
let running = false

export async function loadPublishState() {
  try {
    state = { ...JSON.parse(await fsp.readFile(STATE_FILE, "utf8")), status: "idle" }
  } catch {
    state = { status: "idle" }
  }
}

export function publishState(): Omit<PublishState, "signature"> {
  const visible = { ...state }
  delete visible.signature
  return visible
}

async function setState(patch: Partial<PublishState>) {
  state = { ...state, ...patch }
  await fsp.mkdir(CACHE_DIR, { recursive: true })
  await fsp.writeFile(STATE_FILE, JSON.stringify(state, null, 2))
  publishEvents.emit("change", publishState())
}

/** Something changed: publish later, once it's quiet and not too soon after the last one. */
export function schedulePublish() {
  if (!state.publishedAt && !state.url) return // Not set up yet; the first publish is manual.
  if (!state.pending) void setState({ pending: true })
  if (timer) clearTimeout(timer)
  const sinceLast = Date.now() - new Date(state.publishedAt ?? 0).getTime()
  const wait = Math.max(QUIET_MS, MIN_GAP_MS - sinceLast)
  timer = setTimeout(() => void publishNow(), wait)
}

export async function publishNow() {
  if (running) return publishState()
  running = true
  if (timer) clearTimeout(timer)
  await setState({ status: "publishing", error: undefined })
  try {
    const { signature, count } = await buildSite()
    if (signature === state.signature && state.url) {
      // Nothing visible changed since the last publish.
      await setState({ status: "idle", pending: false })
    } else {
      const url = await deploy()
      await setState({
        status: "idle",
        pending: false,
        url,
        items: count,
        signature,
        publishedAt: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.warn(`[publish] ${errorMessage(error)}`)
    await setState({ status: "error", error: friendlyError(error) })
  } finally {
    running = false
  }
  return publishState()
}

function friendlyError(error: unknown) {
  const text = `${errorMessage(error)} ${(error as { output?: string }).output ?? ""}`
  if (/not logged in|authenticat|login/i.test(text)) return "Not signed in to Cloudflare."
  if (/too many files|file count/i.test(text)) return "The gallery has more files than Cloudflare's free plan allows."
  return errorMessage(error).split("\n")[0].slice(0, 200)
}

// ---------- Building the site ----------

async function buildSite() {
  // The gallery version of the app: same look, no editing.
  await run(process.execPath, [VITE, "build", "--mode", "gallery", "--outDir", BUILD_DIR, "--emptyOutDir"], 5 * 60_000, ROOT)

  await fsp.mkdir(MEDIA_DIR, { recursive: true })
  const { items } = await listItems()
  const keep = new Set<string>()
  const published: Item[] = []

  for (const item of items) {
    if (item.kind === "link") {
      published.push(toPublic(item, `link-${hash(item.id)}`))
      continue
    }
    const file = getFile(item.id)
    if (!file) continue
    try {
      const key = hash(`${file.rel}|${file.size}|${file.mtimeMs}`)
      const media = await exportMedia(file, key)
      if (!media) continue
      Object.values(media).forEach((name) => name && keep.add(name))
      published.push({ ...toPublic(item, key), media })
    } catch (error) {
      console.warn(`[publish] skipped ${item.id}: ${errorMessage(error)}`)
    }
  }

  // Remove media for things that were deleted.
  for (const name of await fsp.readdir(MEDIA_DIR)) {
    if (!keep.has(name)) await fsp.rm(path.join(MEDIA_DIR, name), { force: true })
  }

  // Swap in the freshly built app (everything except the media folder).
  for (const name of await fsp.readdir(SITE_DIR)) {
    if (name !== "m") await fsp.rm(path.join(SITE_DIR, name), { recursive: true, force: true })
  }
  await fsp.cp(BUILD_DIR, SITE_DIR, { recursive: true })

  const data = JSON.stringify({ items: published, folder: "" })
  await fsp.writeFile(path.join(SITE_DIR, "data.json"), data)
  await fsp.writeFile(
    path.join(SITE_DIR, "_headers"),
    ["/m/*", "  Cache-Control: public, max-age=31536000, immutable", "/data.json", "  Cache-Control: no-cache", ""].join("\n")
  )

  const fileCount = await countFiles(SITE_DIR)
  if (fileCount > MAX_FILES) {
    throw new Error(`The gallery has ${fileCount} files, more than Cloudflare's free plan allows (20,000).`)
  }
  const assets = (await fsp.readdir(path.join(BUILD_DIR, "assets"))).sort().join(",")
  return { signature: hash(data + assets), count: published.length }
}

async function countFiles(dir: string): Promise<number> {
  let total = 0
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? await countFiles(path.join(dir, entry.name)) : 1
  }
  return total
}

/** What visitors may see. Notes stay private, and file names aren't needed. */
function toPublic(item: Item, id: string): Item {
  return { ...item, id, name: "", folder: null, note: "", size: 0 }
}

type Source = NonNullable<ReturnType<typeof getFile>>

async function exportMedia(file: Source, key: string) {
  await ensureDownloaded(file.abs)
  const thumbSource = await mediaFile(file, "thumb")
  if (!thumbSource) return null
  const thumb = `${key}-t${path.extname(thumbSource).toLowerCase()}`
  await copyOnce(thumbSource, thumb)

  const full = VIDEO_EXTS.has(file.ext) ? await exportVideo(file, key) : await exportImage(file, key)
  return { thumb, full }
}

async function copyOnce(from: string, name: string) {
  const target = path.join(MEDIA_DIR, name)
  if (!(await exists(target))) await fsp.copyFile(from, target)
}

async function sizeOf(file: string) {
  return (await fsp.stat(file)).size
}

// Full resolution whenever it fits; otherwise the sharpest JPEG that does.
async function exportImage(file: Source, key: string) {
  if (BROWSER_IMAGES.has(file.ext) && file.size <= MAX_FILE_BYTES) {
    const name = `${key}.${file.ext}`
    await copyOnce(file.abs, name)
    return name
  }
  const name = `${key}.jpg`
  const target = path.join(MEDIA_DIR, name)
  if (await exists(target)) return name
  for (const maxSide of [0, 6000, 4000, 3000]) {
    const resize = maxSide ? ["-Z", String(maxSide)] : []
    await run("sips", [...resize, "-s", "format", "jpeg", "-s", "formatOptions", "90", file.abs, "--out", target], 120_000)
    if ((await sizeOf(target)) <= MAX_FILE_BYTES) return name
  }
  await fsp.rm(target, { force: true })
  return null
}

// The original if it fits; otherwise re-encoded by macOS at 1080p, then 720p.
async function exportVideo(file: Source, key: string) {
  if (BROWSER_VIDEOS.has(file.ext) && file.size <= MAX_FILE_BYTES) {
    const name = `${key}.${file.ext}`
    await copyOnce(file.abs, name)
    return name
  }
  const name = `${key}.mp4`
  const target = path.join(MEDIA_DIR, name)
  if (await exists(target)) return name
  for (const preset of ["Preset1920x1080", "Preset1280x720"]) {
    await run("avconvert", ["--source", file.abs, "--preset", preset, "--output", target, "--replace"], 30 * 60_000)
    if ((await sizeOf(target)) <= MAX_FILE_BYTES) return name
  }
  // Too long to fit even at 720p: the gallery shows the still and links to the source.
  await fsp.rm(target, { force: true })
  return null
}

// ---------- Sending it to Cloudflare ----------

// Cloudflare's static hosting (Workers static assets, which replaced Pages).
// Run from the cache folder so the tool doesn't try to configure this project.
async function deploy() {
  const output = await run(
    process.execPath,
    [WRANGLER, "deploy", "--assets", SITE_DIR, "--name", PROJECT, "--compatibility-date", "2026-10-01"],
    60 * 60_000,
    CACHE_DIR
  )
  const url = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/)?.[0]
  if (!url) throw new Error("Published, but Cloudflare didn't say where.")
  return url
}
