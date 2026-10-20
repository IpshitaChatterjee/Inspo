import fsp from "node:fs/promises"
import path from "node:path"

import { TMP_DIR } from "./config.ts"
import { hash, run } from "./util.ts"

// Finds the main colours in an image, so searching "green" finds green things.
// The image is shrunk to a few hundred pixels with sips (built into macOS),
// then each pixel is sorted into a named colour.

const SIZE = 96
// A colour must cover this much of the image to count; neutrals need more.
const MIN_SHARE = 0.015
const MIN_NEUTRAL_SHARE = 0.2

export type Colors = { names: string[]; palette: string[] }

export async function colorsOf(image: string): Promise<Colors> {
  await fsp.mkdir(TMP_DIR, { recursive: true })
  const bmp = path.join(TMP_DIR, `${hash(image + Date.now())}.bmp`)
  try {
    await run("sips", ["-z", String(SIZE), String(SIZE), "-s", "format", "bmp", image, "--out", bmp])
    return summarize(readBmp(await fsp.readFile(bmp)))
  } finally {
    await fsp.rm(bmp, { force: true })
  }
}

type Rgb = [number, number, number]

// Uncompressed 24/32-bit BMP, which is what sips writes.
function readBmp(buffer: Buffer): Rgb[] {
  const offset = buffer.readUInt32LE(10)
  const width = buffer.readInt32LE(18)
  const height = Math.abs(buffer.readInt32LE(22))
  const bytes = buffer.readUInt16LE(28) / 8
  const rowSize = Math.ceil((width * bytes) / 4) * 4
  const pixels: Rgb[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = offset + y * rowSize + x * bytes
      if (bytes === 4 && buffer[i + 3] < 128) continue // transparent
      pixels.push([buffer[i + 2], buffer[i + 1], buffer[i]])
    }
  }
  return pixels
}

function nameOf([r, g, b]: Rgb) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d) {
    if (max === r / 255) h = 60 * (((g - b) / 255 / d) % 6)
    else if (max === g / 255) h = 60 * ((b - r) / 255 / d + 2)
    else h = 60 * ((r - g) / 255 / d + 4)
  }
  if (h < 0) h += 360

  if (l < 0.13) return "black"
  if (l > 0.93) return "white"
  // Judged on how much colour there is (max − min), not HSL saturation, which
  // calls a barely tinted off-white "saturated".
  if (d < 0.12 || s < 0.15) return l > 0.65 ? "white" : l < 0.3 ? "black" : "gray"
  if (h >= 20 && h < 50 && l < 0.4) return "brown"
  if (h >= 25 && h < 60 && s < 0.55 && l > 0.7) return "beige"
  if (h < 12 || h >= 345) return "red"
  if (h < 40) return "orange"
  if (h < 65) return "yellow"
  if (h < 165) return "green"
  if (h < 195) return "teal"
  if (h < 255) return "blue"
  if (h < 290) return "purple"
  return "pink"
}

const NEUTRALS = new Set(["black", "white", "gray"])

function summarize(pixels: Rgb[]): Colors {
  const groups = new Map<string, Rgb[]>()
  for (const pixel of pixels) {
    const name = nameOf(pixel)
    groups.set(name, [...(groups.get(name) ?? []), pixel])
  }
  const ranked = [...groups.entries()]
    .map(([name, members]) => ({ name, members, share: members.length / (pixels.length || 1) }))
    .filter((c) => c.share >= (NEUTRALS.has(c.name) ? MIN_NEUTRAL_SHARE : MIN_SHARE))
    .sort((a, b) => b.share - a.share)

  return {
    names: ranked.map((c) => c.name),
    // One swatch per colour: the average of the pixels that fell into it.
    palette: ranked.slice(0, 6).map((c) => toHex(average(c.members))),
  }
}

function average(pixels: Rgb[]): Rgb {
  const sum = pixels.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0])
  return sum.map((v) => Math.round(v / pixels.length)) as Rgb
}

function toHex(rgb: Rgb) {
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`
}
