import fsp from "node:fs/promises"
import path from "node:path"

import { CACHE_DIR, THUMB_DIR } from "./config.ts"
import { ensureDownloaded, exists, hash, limiter, run } from "./util.ts"

// Thumbnails and sizes come from tools built into macOS (sips for images,
// Quick Look for videos), so there is nothing extra to install.

export const IMAGE_EXTS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif", "tif", "tiff", "bmp", "svg",
])
export const VIDEO_EXTS = new Set(["mp4", "mov", "m4v", "webm"])

// Browsers can't show these, so we hand out a converted JPEG instead.
const NEEDS_CONVERSION = new Set(["heic", "heif", "tif", "tiff"])
// Shown as-is: resizing would kill the animation or the vector.
const KEEP_ORIGINAL = new Set(["gif", "svg"])

export type Size = "thumb" | "large" | "orig"

type Source = { abs: string; ext: string; size: number; mtimeMs: number }

const queue = limiter(4)
// Separate line for measuring, so a big first scan doesn't hold up thumbnails.
const measureQueue = limiter(3)
const inFlight = new Map<string, Promise<string | null>>()

function once(key: string, job: () => Promise<string | null>) {
  let pending = inFlight.get(key)
  if (!pending) {
    pending = queue(job).finally(() => inFlight.delete(key))
    inFlight.set(key, pending)
  }
  return pending
}

/** Path of the file to send for this size, or null if none could be made. */
export async function mediaFile(source: Source, size: Size): Promise<string | null> {
  const { abs, ext } = source
  await ensureDownloaded(abs)
  if (size === "orig") return abs
  const isVideo = VIDEO_EXTS.has(ext)

  if (isVideo) return size === "thumb" ? videoPoster(source) : abs
  if (KEEP_ORIGINAL.has(ext)) return abs
  if (size === "large") return NEEDS_CONVERSION.has(ext) ? resized(source, 2400) : abs
  return resized(source, 900)
}

function cacheKey(source: Source, variant: string) {
  return hash(`${source.abs}|${source.size}|${source.mtimeMs}|${variant}`)
}

async function resized(source: Source, maxSide: number) {
  const format = source.ext === "png" ? "png" : "jpeg"
  const out = path.join(THUMB_DIR, `${cacheKey(source, `img${maxSide}`)}.${format === "png" ? "png" : "jpg"}`)
  if (await exists(out)) return out
  return once(out, async () => {
    await fsp.mkdir(THUMB_DIR, { recursive: true })
    try {
      await run("sips", ["-Z", String(maxSide), "-s", "format", format, source.abs, "--out", out])
      return out
    } catch {
      // Unknown format for sips: fall back to the original (or nothing).
      return NEEDS_CONVERSION.has(source.ext) ? null : source.abs
    }
  })
}

async function videoPoster(source: Source) {
  const out = path.join(THUMB_DIR, `${cacheKey(source, "poster")}.png`)
  if (await exists(out)) return out
  return once(out, async () => {
    const workDir = path.join(THUMB_DIR, `ql-${cacheKey(source, "work")}`)
    await fsp.mkdir(workDir, { recursive: true })
    try {
      await run("qlmanage", ["-t", "-s", "900", "-o", workDir, source.abs], 30_000)
      const made = (await fsp.readdir(workDir)).find((f) => f.endsWith(".png"))
      if (!made) return null
      await fsp.rename(path.join(workDir, made), out)
      return out
    } catch {
      return null
    } finally {
      await fsp.rm(workDir, { recursive: true, force: true })
    }
  })
}

// ---------- Pixel sizes (needed to lay out the grid before images load) ----------

const DIMS_FILE = path.join(CACHE_DIR, "dims.json")
let dims: Record<string, [number, number] | null> = {}
let dimsLoaded = false
let dimsDirty = false

async function loadDims() {
  if (dimsLoaded) return
  dimsLoaded = true
  try {
    dims = JSON.parse(await fsp.readFile(DIMS_FILE, "utf8"))
  } catch {
    dims = {}
  }
}

export function dimsKey(source: Source) {
  return `${source.abs}|${source.size}|${source.mtimeMs}`
}

export async function cachedDims(source: Source) {
  await loadDims()
  return dims[dimsKey(source)]
}

/** Works out sizes for files we haven't measured yet. Resolves true if any changed. */
export async function measureAll(sources: Source[]) {
  await loadDims()
  const missing = sources.filter((s) => !(dimsKey(s) in dims))
  if (!missing.length) return false
  await Promise.all(
    missing.map((source) =>
      measureQueue(async () => {
        try {
          dims[dimsKey(source)] = await measure(source)
          dimsDirty = true
        } catch {
          // Not readable yet (e.g. still downloading); try again next scan.
        }
      })
    )
  )
  if (dimsDirty) {
    dimsDirty = false
    await fsp.mkdir(CACHE_DIR, { recursive: true })
    await fsp.writeFile(DIMS_FILE, JSON.stringify(dims))
  }
  return true
}

async function measure(source: Source): Promise<[number, number] | null> {
  await ensureDownloaded(source.abs)
  if (VIDEO_EXTS.has(source.ext)) {
    const out = await run("mdls", ["-raw", "-name", "kMDItemPixelWidth", "-name", "kMDItemPixelHeight", source.abs])
    const [w, h] = out.split(/\0|\n/).map(Number)
    return w > 0 && h > 0 ? [w, h] : null
  }
  if (source.ext === "svg") return null
  const out = await run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", source.abs])
  const w = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1])
  const h = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1])
  return w > 0 && h > 0 ? [w, h] : null
}
