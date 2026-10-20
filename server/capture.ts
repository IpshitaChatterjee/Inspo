import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as WebReadableStream } from "node:stream/web"

import { TMP_DIR } from "./config.ts"
import { errorMessage, hash } from "./util.ts"

// Turns a link into real image/video files, so you keep a copy even if the
// post disappears. Tweets go through the public fxtwitter API; everything
// else falls back to the page's preview tags (og:image / og:video).

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
const BOT_UA =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
const MAX_BYTES = 500 * 1024 * 1024

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
}
const MEDIA_EXTS = new Set(Object.values(EXT_BY_TYPE).concat("jpeg", "m4v"))

export type CapturedFile = {
  tempPath: string
  ext: string
  width?: number
  height?: number
}

export type Capture = {
  url: string
  title?: string
  description?: string
  files: CapturedFile[]
}

export function normalizeUrl(input: string) {
  const trimmed = input.trim()
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(withScheme)
  return url.toString()
}

export function extractUrls(text: string) {
  const found = text.match(/https?:\/\/[^\s<>"']+/gi) ?? []
  return [...new Set(found.map((u) => u.replace(/[),.;!?]+$/, "")))]
}

export async function captureUrl(input: string): Promise<Capture> {
  const url = normalizeUrl(input)
  const tweetId = tweetIdFrom(url)
  if (tweetId) {
    const tweet = await captureTweet(url, tweetId).catch((error) => {
      console.warn(`[capture] tweet lookup failed: ${errorMessage(error)}`)
      return null
    })
    if (tweet) return tweet
  }
  return capturePage(url)
}

// ---------- Tweets ----------

function tweetIdFrom(url: string) {
  const { hostname, pathname } = new URL(url)
  const host = hostname.replace(/^(www\.|mobile\.)/, "")
  const isTwitter = /^(twitter|x|fxtwitter|vxtwitter|fixupx|fixvx)\.com$/.test(host)
  return isTwitter ? (pathname.match(/\/status(?:es)?\/(\d+)/)?.[1] ?? null) : null
}

type FxMedia = { type: string; url: string; width?: number; height?: number }

async function captureTweet(url: string, id: string): Promise<Capture> {
  const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
    headers: { "User-Agent": BROWSER_UA },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`fxtwitter answered ${res.status}`)
  const { tweet } = (await res.json()) as {
    tweet: {
      text?: string
      author?: { name?: string; screen_name?: string }
      media?: { all?: FxMedia[] }
      quote?: { media?: { all?: FxMedia[] } }
    }
  }
  const media = [...(tweet.media?.all ?? []), ...(tweet.quote?.media?.all ?? [])]
  const files: CapturedFile[] = []
  for (const item of media) {
    const mediaUrl =
      item.type === "photo" && !item.url.includes("?")
        ? `${item.url}?name=orig`
        : item.url
    const file = await download(mediaUrl).catch((error) => {
      console.warn(`[capture] could not download ${mediaUrl}: ${errorMessage(error)}`)
      return null
    })
    if (file) files.push({ ...file, width: item.width, height: item.height })
  }
  // No title: the image's own headline (or the tweet text) makes a better one.
  const author = tweet.author ? `${tweet.author.name} (@${tweet.author.screen_name})` : null
  return {
    url,
    description: [author, tweet.text].filter(Boolean).join(" — ") || undefined,
    files,
  }
}

// ---------- Any other page ----------

async function capturePage(url: string): Promise<Capture> {
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html,*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`The page answered ${res.status}`)

  // The link points straight at an image or video.
  const type = contentType(res)
  if (type.startsWith("image/") || type.startsWith("video/")) {
    const file = await saveResponse(res, res.url)
    return { url, files: [file] }
  }

  let html = await readText(res)
  let meta = parseMeta(html)
  if (!hasMedia(meta)) {
    // Some sites only show preview tags to link-preview bots.
    const botRes = await fetch(url, {
      headers: { "User-Agent": BOT_UA },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null)
    if (botRes?.ok) {
      const botHtml = await readText(botRes)
      const botMeta = parseMeta(botHtml)
      if (hasMedia(botMeta)) [html, meta] = [botHtml, botMeta]
    }
  }

  const base = res.url || url
  const resolve = (value: string) => {
    try {
      return new URL(value, base).toString()
    } catch {
      return null
    }
  }
  const title = first(meta, "og:title", "twitter:title") ?? meta.get("<title>")?.[0]
  const description = first(meta, "og:description", "twitter:description", "description")

  const files: CapturedFile[] = []
  const tryDownload = async (candidate: string) => {
    const resolved = resolve(candidate)
    if (!resolved) return
    try {
      files.push(await download(resolved))
    } catch (error) {
      console.warn(`[capture] could not download ${resolved}: ${errorMessage(error)}`)
    }
  }

  // Videos embedded in the page itself come first: preview tags often only
  // carry a still with a play button drawn on it.
  for (const video of [...new Set([...pageVideos(html), ...videoCandidates(meta)])]) {
    await tryDownload(video)
    if (files.length) break
  }
  // A still is only worth keeping when there was no video to grab.
  if (!files.length) {
    for (const image of imageCandidates(meta).slice(0, 4)) await tryDownload(image)
  }

  return { url, title, description, files }
}

type Meta = Map<string, string[]>

function parseMeta(html: string): Meta {
  const meta: Meta = new Map()
  const add = (key: string, value: string) => {
    const list = meta.get(key) ?? []
    if (!list.includes(value)) list.push(value)
    meta.set(key, list)
  }
  for (const [tag] of html.matchAll(/<meta\s[^>]*>/gi)) {
    const attrs = parseAttrs(tag)
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop)?.toLowerCase()
    if (key && attrs.content) add(key, attrs.content)
  }
  for (const [tag] of html.matchAll(/<link\s[^>]*>/gi)) {
    const attrs = parseAttrs(tag)
    if (attrs.rel?.toLowerCase() === "image_src" && attrs.href) add("image_src", attrs.href)
  }
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim()
  if (title) add("<title>", decodeEntities(title))
  return meta
}

function parseAttrs(tag: string) {
  const attrs: Record<string, string> = {}
  for (const m of tag.matchAll(/([a-zA-Z_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "")
  }
  return attrs
}

function decodeEntities(value: string): string {
  // Some sites encode twice (&amp;#39;), so decode until nothing changes.
  const once = decodeOnce(value)
  return once === value ? once : decodeEntities(once)
}

function decodeOnce(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
}

function first(meta: Meta, ...keys: string[]) {
  for (const key of keys) {
    const value = meta.get(key)?.[0]
    if (value) return value
  }
  return undefined
}

function videoCandidates(meta: Meta) {
  // og:video is often an embeddable HTML player, which we can't save.
  const types = meta.get("og:video:type") ?? []
  const ogIsPlayer = types.length > 0 && types.every((t) => t.includes("html"))
  const og = ogIsPlayer
    ? []
    : [
        ...(meta.get("og:video:secure_url") ?? []),
        ...(meta.get("og:video:url") ?? []),
        ...(meta.get("og:video") ?? []),
      ]
  return [...new Set([...og, ...(meta.get("twitter:player:stream") ?? [])])].filter(
    (url) => !/\.(html?|php)(\?|$)/i.test(url) && !/\/embed\//i.test(url)
  )
}

/**
 * Video files the page plays directly, best quality first: a player's list of
 * sources (LinkedIn's data-sources), schema.org VideoObject contentUrl, and
 * plain <video>/<source> tags.
 */
function pageVideos(html: string) {
  const found: { url: string; bitrate: number }[] = []
  for (const [, raw] of html.matchAll(/data-sources="([^"]+)"/g)) {
    try {
      const sources = JSON.parse(decodeEntities(raw)) as { src?: string; type?: string; "data-bitrate"?: number }[]
      for (const source of sources) {
        if (source.src && (source.type ?? "video").startsWith("video")) {
          found.push({ url: source.src, bitrate: source["data-bitrate"] ?? 0 })
        }
      }
    } catch {
      // Not a list of sources after all.
    }
  }
  for (const [, url] of html.matchAll(/"contentUrl"\s*:\s*"([^"]+)"/g)) {
    found.push({ url: url.replace(/\\\//g, "/"), bitrate: -1 })
  }
  for (const [tag] of html.matchAll(/<(?:video|source)\s[^>]*>/gi)) {
    const attrs = parseAttrs(tag)
    const type = attrs.type ?? ""
    if (attrs.src && (type.startsWith("video") || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(attrs.src))) {
      found.push({ url: attrs.src, bitrate: -2 })
    }
  }
  return found
    .filter(({ url }) => /^https?:\/\//.test(url) && !/\.m3u8(\?|$)/i.test(url))
    .sort((a, b) => b.bitrate - a.bitrate)
    .map(({ url }) => url)
}

function imageCandidates(meta: Meta) {
  return [
    ...new Set([
      ...(meta.get("og:image:secure_url") ?? []),
      ...(meta.get("og:image") ?? []),
      ...(meta.get("og:image:url") ?? []),
      ...(meta.get("twitter:image") ?? []),
      ...(meta.get("twitter:image:src") ?? []),
      ...(meta.get("image_src") ?? []),
    ]),
  ]
}

function hasMedia(meta: Meta) {
  return videoCandidates(meta).length > 0 || imageCandidates(meta).length > 0
}

async function readText(res: Response) {
  const text = await res.text()
  return text.slice(0, 2_000_000)
}

// ---------- Downloading ----------

function contentType(res: Response) {
  return (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase()
}

function extFromUrl(url: string) {
  const ext = path.extname(new URL(url).pathname).slice(1).toLowerCase()
  return MEDIA_EXTS.has(ext) ? (ext === "jpeg" ? "jpg" : ext) : null
}

async function download(url: string): Promise<CapturedFile> {
  const res = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA },
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new Error(`answered ${res.status}`)
  return saveResponse(res, url)
}

async function saveResponse(res: Response, url: string): Promise<CapturedFile> {
  const ext = EXT_BY_TYPE[contentType(res)] ?? extFromUrl(url)
  if (!ext) throw new Error(`not an image or video (${contentType(res) || "unknown type"})`)
  const size = Number(res.headers.get("content-length") ?? 0)
  if (size > MAX_BYTES) throw new Error("file is larger than 500 MB")
  if (!res.body) throw new Error("empty response")

  await fsp.mkdir(TMP_DIR, { recursive: true })
  const tempPath = path.join(TMP_DIR, `${hash(url + Date.now() + Math.random())}.${ext}`)
  await pipeline(
    Readable.fromWeb(res.body as unknown as WebReadableStream),
    fs.createWriteStream(tempPath)
  )
  return { tempPath, ext }
}
