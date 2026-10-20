import { describe, expect, test } from "vitest"
import { componentTagCounts, filterComponents } from "./search"
import type { LibraryEntry } from "./index"

const entry = (title: string, tags: string[]): LibraryEntry => ({
  meta: {
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    description: "",
    tags,
    createdAt: "2026-10-20",
    controls: [],
    prompt: () => "",
  },
  source: "",
  load: () => Promise.reject(new Error("not used")),
})

const a = entry("Dotted glass", ["background", "shader"])
const b = entry("Plain", [])

describe("component search", () => {
  test("everything", () =>
    expect(filterComponents([a, b], { kind: "all" }, "")).toEqual([a, b]))
  test("by tag", () =>
    expect(
      filterComponents([a, b], { kind: "tag", name: "shader" }, "")
    ).toEqual([a]))
  test("untagged", () =>
    expect(filterComponents([a, b], { kind: "untagged" }, "")).toEqual([b]))
  test("search words, any case, # ignored", () =>
    expect(filterComponents([a, b], { kind: "all" }, "#Shader dotted")).toEqual(
      [a]
    ))
  test("tag counts", () =>
    expect(componentTagCounts([a, b])).toEqual([
      { name: "background", count: 1, mine: true },
      { name: "shader", count: 1, mine: true },
    ]))
})
