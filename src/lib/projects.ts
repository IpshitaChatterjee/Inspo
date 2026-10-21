import type { Item } from "@/lib/api"

export type Board = {
  layout: string
  /** Item ids in the order they fill the board's picture cells. */
  order: string[]
  /** Item ids left off the board (still in the project). */
  hidden: string[]
  colors: boolean
  type: boolean
  title: boolean
  gap: number
  radius: number
  background: string
}

export type Project = {
  id: string
  name: string
  createdAt: string
  archived?: boolean
  items: string[]
  board?: Partial<Board>
}

export const BOARD_DEFAULTS: Board = {
  layout: "feature",
  order: [],
  hidden: [],
  colors: true,
  type: true,
  title: true,
  gap: 10,
  radius: 12,
  background: "#fbfaf6",
}

export type Tile = "title" | "colors" | "type"

// A bento: CSS grid areas, plus which areas hold the colour, type and title
// tiles. A tile that's switched off hands its area to a picture.
export type Layout = {
  id: string
  name: string
  areas: string[]
  tiles: Record<Tile, string>
}

export const LAYOUTS: Layout[] = [
  {
    id: "feature",
    name: "Feature",
    areas: ["a a b c", "a a d e", "f g h h"],
    tiles: { title: "c", colors: "e", type: "h" },
  },
  {
    id: "gallery",
    name: "Gallery",
    areas: ["a b b c", "a d e c", "f d g h"],
    tiles: { title: "f", colors: "g", type: "e" },
  },
  {
    id: "wide",
    name: "Wide",
    areas: ["a a a b", "c d e b", "c f g g"],
    tiles: { title: "d", colors: "f", type: "g" },
  },
  {
    id: "mosaic",
    name: "Mosaic",
    areas: ["a b c d", "e e f d", "g h f i"],
    tiles: { title: "a", colors: "i", type: "e" },
  },
]

export function boardOf(project: Project): Board {
  return { ...BOARD_DEFAULTS, ...project.board }
}

export function layoutOf(id: string) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0]
}

/** Every distinct area name, in reading order. */
export function areasOf(layout: Layout) {
  return [...new Set(layout.areas.join(" ").split(/\s+/))]
}

/** The project's pictures in board order: saved order first, then anything newer. */
export function boardPictures(project: Project, board: Board, items: Item[]) {
  const byId = new Map(items.map((item) => [item.id, item]))
  const ids = [
    ...board.order.filter((id) => project.items.includes(id)),
    ...project.items.filter((id) => !board.order.includes(id)),
  ]
  return ids
    .map((id) => byId.get(id))
    .filter((item): item is Item => !!item && item.kind !== "link")
}

export type Cell =
  | { area: string; kind: Tile }
  | { area: string; kind: "picture"; item: Item | null }

/** What fills each area: the switched-on tiles where the layout puts them, pictures everywhere else. */
export function fillBoard(
  layout: Layout,
  board: Board,
  pictures: Item[]
): Cell[] {
  const shown = pictures.filter((item) => !board.hidden.includes(item.id))
  const tileAt = new Map(
    (Object.entries(layout.tiles) as [Tile, string][])
      .filter(([tile]) => board[tile])
      .map(([tile, area]) => [area, tile])
  )
  let next = 0
  return areasOf(layout).map((area) => {
    const tile = tileAt.get(area)
    if (tile) return { area, kind: tile }
    return { area, kind: "picture", item: shown[next++] ?? null }
  })
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function distance(a: string, b: string) {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2)
}

/** The main colours across the pictures: each picture's palette, most important first, near-duplicates merged. */
export function boardColors(pictures: Item[], max = 8) {
  const scored: { hex: string; score: number }[] = []
  for (const item of pictures) {
    item.palette.forEach((hex, rank) => {
      const weight = 1 / (rank + 1)
      const close = scored.find((c) => distance(c.hex, hex) < 40)
      if (close) close.score += weight
      else scored.push({ hex: hex.toLowerCase(), score: weight })
    })
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((c) => c.hex)
}

/** The closest Google Fonts found most often, best first. */
export function boardFonts(pictures: Item[], max = 2) {
  const counts = new Map<
    string,
    { family: string; weight: number; count: number }
  >()
  for (const item of pictures) {
    const best = item.fonts[0]
    if (!best) continue
    const entry = counts.get(best.family) ?? { ...best, count: 0 }
    entry.count++
    counts.set(best.family, entry)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, max)
}
