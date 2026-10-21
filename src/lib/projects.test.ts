import { describe, expect, test } from "vitest"

import type { Item } from "@/lib/api"
import {
  areasOf,
  BOARD_DEFAULTS,
  boardColors,
  boardFonts,
  boardPictures,
  fillBoard,
  LAYOUTS,
  layoutOf,
  type Project,
} from "@/lib/projects"

const item = (id: string, extra: Partial<Item> = {}): Item => ({
  id,
  kind: "image",
  name: id,
  folder: null,
  size: 1,
  addedAt: "2026-10-21T00:00:00.000Z",
  width: 100,
  height: 100,
  title: null,
  description: null,
  source: null,
  note: "",
  tags: [],
  autoTags: [],
  text: null,
  colors: [],
  palette: [],
  fonts: [],
  version: 1,
  ...extra,
})

const project = (items: string[], board = {}): Project => ({
  id: "p",
  name: "Rebrand",
  createdAt: "2026-10-21",
  items,
  board,
})

describe("layouts", () => {
  test("every tile sits in an area the layout has", () => {
    for (const layout of LAYOUTS) {
      for (const area of Object.values(layout.tiles)) {
        expect(areasOf(layout)).toContain(area)
      }
    }
  })

  test("an unknown layout falls back to the first", () => {
    expect(layoutOf("nope")).toBe(LAYOUTS[0])
  })
})

describe("boardPictures", () => {
  const items = [
    item("a"),
    item("b"),
    item("c"),
    item("link", { kind: "link" }),
  ]

  test("keeps the saved order, then adds anything newer", () => {
    const p = project(["a", "b", "c"])
    const board = { ...BOARD_DEFAULTS, order: ["c", "a"] }
    expect(boardPictures(p, board, items).map((i) => i.id)).toEqual([
      "c",
      "a",
      "b",
    ])
  })

  test("leaves out links and anything no longer in the project", () => {
    const p = project(["a", "link"])
    const board = { ...BOARD_DEFAULTS, order: ["gone", "a"] }
    expect(boardPictures(p, board, items).map((i) => i.id)).toEqual(["a"])
  })
})

describe("fillBoard", () => {
  const layout = layoutOf("feature")
  const pictures = ["1", "2", "3", "4", "5", "6"].map((id) => item(id))

  test("puts tiles where the layout says and pictures elsewhere, in order", () => {
    const cells = fillBoard(layout, BOARD_DEFAULTS, pictures)
    expect(cells.find((c) => c.area === "c")?.kind).toBe("title")
    const filled = cells.flatMap((c) =>
      c.kind === "picture" && c.item ? [c.item.id] : []
    )
    expect(filled).toEqual(["1", "2", "3", "4", "5"])
  })

  test("a switched-off tile hands its area to a picture", () => {
    const cells = fillBoard(
      layout,
      { ...BOARD_DEFAULTS, title: false },
      pictures
    )
    expect(cells.find((c) => c.area === "c")?.kind).toBe("picture")
    expect(cells.filter((c) => c.kind === "picture" && c.item)).toHaveLength(6)
  })

  test("hidden pictures are skipped, and missing ones leave an empty cell", () => {
    const cells = fillBoard(
      layout,
      { ...BOARD_DEFAULTS, hidden: ["1"] },
      pictures.slice(0, 2)
    )
    const pics = cells.filter((c) => c.kind === "picture")
    expect(pics[0]).toMatchObject({ item: { id: "2" } })
    expect(pics.at(-1)).toMatchObject({ item: null })
  })
})

describe("boardColors", () => {
  test("merges near-identical colours and ranks by how often they lead", () => {
    const pictures = [
      item("1", { palette: ["#ff0000", "#00ff00"] }),
      item("2", { palette: ["#fe0101", "#0000ff"] }),
    ]
    expect(boardColors(pictures)).toEqual(["#ff0000", "#00ff00", "#0000ff"])
  })

  test("stops at the maximum", () => {
    const pictures = [item("1", { palette: ["#000000", "#ffffff", "#ff0000"] })]
    expect(boardColors(pictures, 2)).toHaveLength(2)
  })
})

describe("boardFonts", () => {
  test("counts each picture's best match", () => {
    const pictures = [
      item("1", { fonts: [{ family: "Inter", weight: 400 }] }),
      item("2", { fonts: [{ family: "Fraunces", weight: 700 }] }),
      item("3", { fonts: [{ family: "Inter", weight: 700 }] }),
    ]
    expect(boardFonts(pictures).map((f) => f.family)).toEqual([
      "Inter",
      "Fraunces",
    ])
  })
})
