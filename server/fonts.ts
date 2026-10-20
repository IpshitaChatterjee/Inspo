import fsp from "node:fs/promises"
import path from "node:path"

import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from "@napi-rs/canvas"

import { CACHE_DIR } from "./config.ts"
import { errorMessage, exists } from "./util.ts"

// Finds the closest free (Google) font to the headline in an image: the words
// the Mac read are re-drawn in each candidate font and compared with the real
// ones by shape. It names a look-alike, not the actual (often paid) font, and
// only answers when the match is convincing.

const FONT_DIR = path.join(CACHE_DIR, "fonts")
const WEIGHTS = [400, 700]
const HEIGHT = 64
const MIN_SCORE = 0.85 // below this the guesses were wrong in testing

export type FontMatch = { family: string; weight: number; score: number }
export type TextLine = { text: string; x: number; y: number; w?: number; h: number }

const FAMILIES = [
  // Sans
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Source Sans 3", "Raleway", "Nunito",
  "Work Sans", "DM Sans", "Manrope", "Plus Jakarta Sans", "Outfit", "Space Grotesk", "IBM Plex Sans", "Rubik",
  "Karla", "Mulish", "Barlow", "Archivo", "Figtree", "Sora", "Urbanist", "Lexend", "Public Sans", "Geist",
  "Instrument Sans", "Onest", "Albert Sans", "Be Vietnam Pro", "Red Hat Display", "Epilogue", "Syne",
  "Bricolage Grotesque", "Hanken Grotesk", "Schibsted Grotesk", "Familjen Grotesk", "Inter Tight", "Geologica",
  "Golos Text", "Jost", "Kanit",
  // Condensed and display
  "Oswald", "Bebas Neue", "Anton", "Archivo Black", "Barlow Condensed", "Roboto Condensed",
  "Big Shoulders Display", "Unbounded", "Righteous", "Abril Fatface",
  // Mono
  "Space Mono", "IBM Plex Mono", "JetBrains Mono", "Roboto Mono", "DM Mono", "Fira Code", "Source Code Pro",
  "Geist Mono", "Martian Mono",
  // Serif
  "Playfair Display", "Lora", "Merriweather", "Libre Baskerville", "EB Garamond", "Cormorant Garamond",
  "Crimson Pro", "Fraunces", "Newsreader", "Instrument Serif", "DM Serif Display", "Source Serif 4",
  "Noto Serif", "PT Serif", "Spectral", "Bodoni Moda", "Libre Caslon Text", "Gloock", "Young Serif", "Literata",
  "Besley", "Petrona", "Gelasio",
  // Script
  "Caveat", "Dancing Script", "Pacifico", "Great Vibes", "Satisfy",
]

type Candidate = { family: string; weight: number; alias: string }
let candidates: Promise<Candidate[]> | null = null

/** Downloads the fonts once (about 20 MB, kept in the cache) and loads them. */
function loadFonts() {
  candidates ??= (async () => {
    await fsp.mkdir(FONT_DIR, { recursive: true })
    const loaded: Candidate[] = []
    for (const family of FAMILIES) {
      for (const weight of WEIGHTS) {
        const file = path.join(FONT_DIR, `${family.replace(/ /g, "_")}__${weight}.ttf`)
        if (!(await exists(file))) await download(family, weight, file).catch(() => {})
        if (!(await exists(file))) continue
        const alias = `inspo-${family}-${weight}`
        if (GlobalFonts.registerFromPath(file, alias)) loaded.push({ family, weight, alias })
      }
    }
    return loaded
  })().catch((error) => {
    candidates = null
    throw error
  })
  return candidates
}

// Google's font CSS hands out plain TTF files to clients that don't ask for woff2.
async function download(family: string, weight: number, file: string) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)
  ).text()
  const url = css.match(/https:\/\/[^)]+\.ttf/)?.[0]
  if (!url) return // This family has no such weight.
  const res = await fetch(url)
  if (!res.ok) return
  await fsp.writeFile(file, Buffer.from(await res.arrayBuffer()))
}

export async function closestFonts(image: string, lines: TextLine[]): Promise<FontMatch[]> {
  const words = lines.filter((line) => (line.text.match(/\p{L}/gu)?.length ?? 0) >= 4)
  if (!words.length) return []
  // The headline, plus up to two more lines set at about the same size: one
  // line on a busy background can mislead, several rarely agree on a wrong font.
  const tallest = Math.max(...words.map((line) => line.h))
  const sample = words
    .filter((line) => line.h >= tallest * 0.8)
    .sort((a, b) => b.h - a.h)
    .slice(0, 3)

  const targets: { text: string; shape: Shape }[] = []
  for (const line of sample) {
    try {
      const shape = await cropShape(image, line)
      if (shape) targets.push({ text: line.text, shape })
    } catch (error) {
      console.warn(`[fonts] ${errorMessage(error)}`)
    }
  }
  if (!targets.length) return []

  const best = new Map<string, FontMatch>()
  for (const candidate of await loadFonts()) {
    let total = 0
    let counted = 0
    for (const target of targets) {
      const drawn = drawShape(target.text, candidate.alias)
      if (!drawn) continue
      total += compare(target.shape, drawn)
      counted++
    }
    if (!counted) continue
    const score = total / targets.length
    const current = best.get(candidate.family)
    if (!current || score > current.score) {
      best.set(candidate.family, { family: candidate.family, weight: candidate.weight, score: round(score) })
    }
  }
  const ranked = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 3)
  return ranked[0]?.score >= MIN_SCORE ? ranked : []
}

const round = (n: number) => Math.round(n * 100) / 100

// ---------- Shapes: a line of text as a 64px-high ink map ----------

type Shape = { width: number; data: Float32Array } // HEIGHT rows, values 0..1

async function cropShape(imagePath: string, line: TextLine): Promise<Shape | null> {
  const image = await loadImage(await fsp.readFile(imagePath))
  const lh = line.h * image.height
  const x0 = Math.max(0, line.x * image.width - lh * 0.2)
  const y0 = Math.max(0, (1 - line.y - line.h) * image.height - lh * 0.12)
  const x1 = Math.min(image.width, line.w ? (line.x + line.w) * image.width + lh * 0.2 : image.width)
  const y1 = Math.min(image.height, y0 + lh * 1.24)
  const w = Math.round(x1 - x0)
  const h = Math.round(y1 - y0)
  if (w < 4 || h < 4) return null

  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext("2d")
  ctx.drawImage(image, x0, y0, w, h, 0, 0, w, h)
  return toShape(mainBand(inkMask(ctx, w, h), w, h), w, h)
}

function drawShape(text: string, alias: string): Shape | null {
  const probe = createCanvas(10, 10).getContext("2d")
  probe.font = `96px "${alias}"`
  const m = probe.measureText(text)
  const w = Math.ceil(m.width) + 40
  const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 40
  if (w < 4 || h < 4) return null
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = "#000"
  ctx.font = `96px "${alias}"`
  ctx.fillText(text, 20, 20 + m.actualBoundingBoxAscent)
  const { data } = ctx.getImageData(0, 0, w, h)
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4] < 128 ? 1 : 0
  return toShape(mask, w, h)
}

/** Text pixels, whichever way round the colours are (dark on light or light on dark). */
function inkMask(ctx: SKRSContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h)
  const gray = new Uint8Array(w * h)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2])
  }
  const threshold = otsu(gray)
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < mask.length; i++) mask[i] = gray[i] < threshold ? 1 : 0

  // If most of the border counts as "ink", it's the background: flip.
  let border = 0
  let borderInk = 0
  for (let x = 0; x < w; x++) {
    borderInk += mask[x] + mask[(h - 1) * w + x]
    border += 2
  }
  for (let y = 0; y < h; y++) {
    borderInk += mask[y * w] + mask[y * w + w - 1]
    border += 2
  }
  if (borderInk / border > 0.5) for (let i = 0; i < mask.length; i++) mask[i] ^= 1
  return mask

  function otsu(values: Uint8Array) {
    const hist = new Array(256).fill(0)
    for (const v of values) hist[v]++
    const total = values.length
    let sumAll = 0
    for (let i = 0; i < 256; i++) sumAll += i * hist[i]
    let best = 0
    let result = 128
    let w0 = 0
    let sum0 = 0
    for (let i = 0; i < 256; i++) {
      w0 += hist[i]
      if (!w0 || w0 === total) continue
      sum0 += i * hist[i]
      const m0 = sum0 / w0
      const m1 = (sumAll - sum0) / (total - w0)
      const between = w0 * (total - w0) * (m0 - m1) ** 2
      if (between > best) {
        best = between
        result = i
      }
    }
    return result
  }
}

/** Keeps the band of rows with the most ink, dropping bits of the lines above and below. */
function mainBand(mask: Uint8Array, w: number, h: number) {
  const rows = new Array(h).fill(0)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rows[y] += mask[y * w + x]
  let bestStart = 0
  let bestEnd = h
  let bestInk = -1
  let start = -1
  let ink = 0
  for (let y = 0; y <= h; y++) {
    if (y < h && rows[y]) {
      if (start < 0) start = y
      ink += rows[y]
    } else if (start >= 0) {
      if (ink > bestInk) [bestStart, bestEnd, bestInk] = [start, y, ink]
      start = -1
      ink = 0
    }
  }
  const out = new Uint8Array(mask.length)
  for (let y = bestStart; y < bestEnd; y++) for (let x = 0; x < w; x++) out[y * w + x] = mask[y * w + x]
  return out
}

/** Trims to the ink and scales to HEIGHT rows (box-averaged), so shapes are comparable. */
function toShape(mask: Uint8Array, w: number, h: number): Shape | null {
  let minX = w
  let maxX = -1
  let minY = h
  let maxY = -1
  let count = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue
      count++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (count < 20) return null
  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  const width = Math.max(1, Math.round((cw * HEIGHT) / ch))
  return { width, data: resample(mask, w, minX, minY, cw, ch, width, HEIGHT) }
}

function resample(mask: Uint8Array, stride: number, x0: number, y0: number, sw: number, sh: number, dw: number, dh: number) {
  const out = new Float32Array(dw * dh)
  for (let y = 0; y < dh; y++) {
    const sy0 = y0 + Math.floor((y * sh) / dh)
    const sy1 = Math.max(sy0 + 1, y0 + Math.floor(((y + 1) * sh) / dh))
    for (let x = 0; x < dw; x++) {
      const sx0 = x0 + Math.floor((x * sw) / dw)
      const sx1 = Math.max(sx0 + 1, x0 + Math.floor(((x + 1) * sw) / dw))
      let sum = 0
      for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) sum += mask[sy * stride + sx]
      out[y * dw + x] = sum / ((sy1 - sy0) * (sx1 - sx0))
    }
  }
  return out
}

/** Same width, slightly blurred, then how much the ink overlaps; plus how alike the proportions are. */
function compare(target: Shape, candidate: Shape) {
  const aspect = Math.min(target.width, candidate.width) / Math.max(target.width, candidate.width)
  const squeezed = rescale(candidate, target.width)
  const a = blur(target.data, target.width)
  const b = blur(squeezed, target.width)
  let ab = 0
  let aa = 0
  let bb = 0
  for (let i = 0; i < a.length; i++) {
    ab += a[i] * b[i]
    aa += a[i] * a[i]
    bb += b[i] * b[i]
  }
  const overlap = ab / Math.max(1e-6, Math.sqrt(aa * bb))
  return overlap * 0.7 + aspect * 0.3
}

// Area-averaged, so thin strokes (serifs, hairlines) survive the squeeze.
function rescale(shape: Shape, width: number) {
  const out = new Float32Array(width * HEIGHT)
  const ratio = shape.width / width
  for (let x = 0; x < width; x++) {
    const from = x * ratio
    const to = (x + 1) * ratio
    for (let y = 0; y < HEIGHT; y++) {
      let sum = 0
      for (let sx = Math.floor(from); sx < Math.min(shape.width, Math.ceil(to)); sx++) {
        const cover = Math.min(to, sx + 1) - Math.max(from, sx)
        sum += shape.data[y * shape.width + sx] * cover
      }
      out[y * width + x] = sum / ratio
    }
  }
  return out
}

// Three passes of a 3×3 box blur, close to a soft Gaussian.
function blur(data: Float32Array, width: number) {
  let current = data
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(current.length)
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0
        let n = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy
            const xx = x + dx
            if (yy < 0 || yy >= HEIGHT || xx < 0 || xx >= width) continue
            sum += current[yy * width + xx]
            n++
          }
        }
        next[y * width + x] = sum / n
      }
    }
    current = next
  }
  return current
}
