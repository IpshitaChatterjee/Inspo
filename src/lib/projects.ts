import type { Item } from "@/lib/api"

export type Board = {
  layout: string
  /** Item ids in the order they fill the board's picture cells. */
  order: string[]
  /** Item ids left off the board (still in the project). */
  hidden: string[]
  colors: boolean
  type: boolean
  /** 0 shows the main colours; any other number is a shuffled pick. */
  colorSeed: number
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
  colorSeed: 0,
  gap: 10,
  radius: 12,
  background: "#fbfaf6",
}

export type Tile = "colors" | "type"

// A bento: CSS grid areas, plus which areas hold the colour and type tiles. A tile that's switched off hands its area to a picture.
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
    tiles: { colors: "e", type: "h" },
  },
  {
    id: "gallery",
    name: "Gallery",
    areas: ["a b b c", "a d e c", "f d g h"],
    tiles: { colors: "g", type: "e" },
  },
  {
    id: "wide",
    name: "Wide",
    areas: ["a a a b", "c d e b", "c f g g"],
    tiles: { colors: "f", type: "g" },
  },
  {
    id: "mosaic",
    name: "Mosaic",
    areas: ["a b c d", "e e f d", "g h f i"],
    tiles: { colors: "i", type: "e" },
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

type Grid = string[][]

const keyOf = (grid: Grid) => grid.map((row) => row.join(" ")).join("|")

function rectOf(grid: Grid, area: string) {
  const rect = { top: Infinity, bottom: -1, left: Infinity, right: -1 }
  grid.forEach((row, r) =>
    row.forEach((name, c) => {
      if (name !== area) return
      rect.top = Math.min(rect.top, r)
      rect.bottom = Math.max(rect.bottom, r)
      rect.left = Math.min(rect.left, c)
      rect.right = Math.max(rect.right, c)
    })
  )
  return rect
}

// The grid with `area` stretched one row or column into empty spots, or
// null if that strip isn't all empty (so the area stays a rectangle).
function stretch(grid: Grid, area: string, [dr, dc]: [number, number]) {
  const { top, bottom, left, right } = rectOf(grid, area)
  const spots: [number, number][] = []
  if (dr) {
    const r = dr < 0 ? top - 1 : bottom + 1
    for (let c = left; c <= right; c++) spots.push([r, c])
  } else {
    const c = dc < 0 ? left - 1 : right + 1
    for (let r = top; r <= bottom; r++) spots.push([r, c])
  }
  if (!spots.every(([r, c]) => grid[r]?.[c] === "")) return null
  const next = grid.map((row) => [...row])
  for (const [r, c] of spots) next[r][c] = area
  return next
}

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
]

/**
 * The board without gaps: when there are fewer pictures than spots, the
 * pictures (then the tiles) grow a row or column at a time until every spot
 * is covered. Returns the grid areas to draw along with what fills them.
 */
export function fitBoard(layout: Layout, board: Board, pictures: Item[]) {
  const all = fillBoard(layout, board, pictures)
  const isEmpty = (cell: Cell) => cell.kind === "picture" && !cell.item
  const cells = all.filter((cell) => !isEmpty(cell))
  // With no pictures, the empty spots say where pictures will go.
  if (
    !cells.some((cell) => cell.kind === "picture") ||
    cells.length === all.length
  )
    return { areas: layout.areas, cells: all }

  // Pictures fill spots in order; if that leaves a gap nothing can grow
  // into, try them in other spots, staying as close to the order as possible.
  const tiles = cells.filter((cell) => cell.kind !== "picture")
  const items = cells.flatMap((cell) =>
    cell.kind === "picture" && cell.item ? [cell.item] : []
  )
  const spots = all.flatMap((cell) =>
    cell.kind === "picture" ? [cell.area] : []
  )
  for (const chosen of combinations(spots, items.length)) {
    const placed: Cell[] = [
      ...tiles,
      ...chosen.map((area, i) => ({
        area,
        kind: "picture" as const,
        item: items[i],
      })),
    ]
    const done = growToFill(layout, placed)
    if (done)
      return {
        areas: done.map((row) => row.join(" ")),
        cells: all.flatMap(
          (cell) => placed.find((p) => p.area === cell.area) ?? []
        ),
      }
  }
  return { areas: layout.areas, cells: all }
}

/** Every way to pick `n` of the spots, keeping their order, earliest spots first. */
function* combinations(spots: string[], n: number): Generator<string[]> {
  if (n === 0) return yield []
  for (let i = 0; i <= spots.length - n; i++)
    for (const rest of combinations(spots.slice(i + 1), n - 1))
      yield [spots[i], ...rest]
}

// Grows the placed cells a row or column at a time until no spot is empty.
// Pictures grow before tiles, and smaller ones before bigger ones.
function growToFill(layout: Layout, cells: Cell[]): Grid | null {
  const filled = new Set(cells.map((cell) => cell.area))
  const start = layout.areas.map((row) =>
    row.split(/\s+/).map((name) => (filled.has(name) ? name : ""))
  )
  const area = (grid: Grid, name: string) =>
    grid.flat().filter((n) => n === name).length
  const seen = new Set<string>()
  const fill = (grid: Grid): Grid | null => {
    if (!grid.some((row) => row.includes(""))) return grid
    const key = keyOf(grid)
    if (seen.has(key)) return null
    seen.add(key)
    const order = [...cells].sort(
      (a, b) =>
        Number(a.kind !== "picture") - Number(b.kind !== "picture") ||
        area(grid, a.area) - area(grid, b.area)
    )
    for (const cell of order)
      for (const direction of DIRECTIONS) {
        const next = stretch(grid, cell.area, direction)
        const done = next && fill(next)
        if (done) return done
      }
    return null
  }
  return fill(start)
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

// A repeatable random number source, so a shuffled pick of colours stays the
// same every time the board is drawn (and in the export).
function seeded(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Colours from the pictures: each picture's palette, most important first,
 * near-duplicates merged. With a seed, a different pick from the same
 * colours, still leaning towards the ones that show up most.
 */
export function boardColors(pictures: Item[], max = 8, seed = 0) {
  const scored: { hex: string; score: number }[] = []
  for (const item of pictures) {
    item.palette.forEach((hex, rank) => {
      const weight = 1 / (rank + 1)
      const close = scored.find((c) => distance(c.hex, hex) < 40)
      if (close) close.score += weight
      else scored.push({ hex: hex.toLowerCase(), score: weight })
    })
  }
  scored.sort((a, b) => b.score - a.score)
  if (!seed) return scored.slice(0, max).map((c) => c.hex)
  const random = seeded(seed)
  const pool = [...scored]
  const picked: string[] = []
  while (pool.length && picked.length < max) {
    const total = pool.reduce((sum, c) => sum + c.score, 0)
    let at = random() * total
    const index = Math.max(
      0,
      pool.findIndex((c) => (at -= c.score) < 0)
    )
    picked.push(pool.splice(index, 1)[0].hex)
  }
  return picked
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
