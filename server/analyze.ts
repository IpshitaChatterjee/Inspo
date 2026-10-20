import path from "node:path"

import { colorsOf, type Colors } from "./colors.ts"
import { closestFonts, type FontMatch, type TextLine } from "./fonts.ts"
import { mediaFile, VIDEO_EXTS } from "./media.ts"
import { run } from "./util.ts"

// Auto-tags and readable text, from the Mac's own image recognition.
// Nothing is sent anywhere.

const SCRIPT = path.join(import.meta.dirname, "vision.js")

// Labels the Mac gives almost everything, so they say nothing. Never used as tags.
export const IGNORED_TAGS = new Set(["document", "screenshot"])
const MAX_TEXT = 1500

export type Analysis = {
  tags: string[]
  text: string
  headline: string | null
  colors: Colors
  fonts: FontMatch[]
}

const NO_COLORS: Colors = { names: [], palette: [] }

type Line = TextLine

type Source = { abs: string; ext: string; size: number; mtimeMs: number }

export async function analyze(source: Source): Promise<Analysis> {
  // Videos are read from their poster frame; vectors can't be read at all.
  // Images use the full size so small text is still legible.
  const nothing: Analysis = { tags: [], text: "", headline: null, colors: NO_COLORS, fonts: [] }
  if (source.ext === "svg") return nothing
  const image = await mediaFile(source, VIDEO_EXTS.has(source.ext) ? "thumb" : "large")
  if (!image) return nothing

  const out = await run("osascript", ["-l", "JavaScript", SCRIPT, image], 60_000)
  const parsed = JSON.parse(out) as { labels: string[]; lines: Line[] }
  const tags = parsed.labels
    .map((label) => label.replace(/_/g, " ").toLowerCase())
    .filter((tag) => !IGNORED_TAGS.has(tag))
  return {
    tags,
    text: parsed.lines.map((line) => line.text).join("\n").slice(0, MAX_TEXT),
    headline: headline(parsed.lines),
    colors: await colorsOf(image).catch(() => NO_COLORS),
    fonts: await closestFonts(image, parsed.lines).catch(() => []),
  }
}

/**
 * Best title we can make without asking: the image's headline, then the post's
 * caption, then what the image shows. Video frames are often blurry, so for
 * videos the caption comes first.
 */
export function autoTitle(analysis: Analysis, caption: string | undefined, isVideo: boolean) {
  const fromCaption = captionTitle(caption)
  const ordered = isVideo ? [fromCaption, analysis.headline] : [analysis.headline, fromCaption]
  return ordered.find(Boolean) ?? (analysis.tags[0] ? capitalize(analysis.tags[0]) : null)
}

// The biggest text in the image, plus the lines right under it at the same
// size and indent (a headline wrapped over several lines).
function headline(lines: Line[]) {
  const words = lines.filter((line) => /\p{L}{2,}/u.test(line.text))
  if (!words.length) return null
  const tallest = Math.max(...words.map((line) => line.h))
  const byPosition = [...words].sort((a, b) => b.y - a.y)
  const start = byPosition.find((line) => line.h >= tallest * 0.75)!

  const picked = [start]
  // Text in other columns (a paragraph beside the headline) is skipped, not a stop.
  const column = byPosition.filter((line) => line.y < start.y && Math.abs(line.x - start.x) < 0.03)
  for (const line of column) {
    const previous = picked[picked.length - 1]
    const sameSize = line.h >= start.h * 0.75
    const directlyBelow = previous.y - (line.y + line.h) < start.h
    if (!sameSize || !directlyBelow || picked.length === 4) break
    picked.push(line)
  }

  let title = picked
    .map((line) => line.text.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/[\s.,;:|–—-]+$/, "")
  if (title === title.toUpperCase()) title = title.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase())
  title = shorten(title.replace(/^[^\p{L}\p{N}]+/u, ""))
  // Misread text tends to be short and full of symbols; better no title than a garbled one.
  const letters = title.match(/\p{L}/gu)?.length ?? 0
  // A scrap like "ion" isn't a title: ask for two words, or one long one.
  const meaningful = title.split(/\s+/).length >= 2 || title.length >= 6
  return meaningful && letters / title.length > 0.6 ? title : null
}

// The first real line of a caption: no author, links or emoji, and skipping
// lead-ins like "Just shipped:" or "New:".
function captionTitle(caption: string | undefined) {
  if (!caption) return null
  const lines = caption
    .replace(/^.*?\(@\w+\) — /, "")
    .replace(/https?:\/\/\S+/g, "")
    .split("\n")
    .map((line) => line.replace(/^[^\p{L}\p{N}]+/u, "").trim())
    .filter((line) => line && !line.endsWith(":") && line.split(/\s+/).length >= 3)
  if (!lines.length) return null
  return shorten(lines[0].split(/(?<=[.!?])\s/)[0])
}

function shorten(text: string, max = 70) {
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
