import { describe, expect, it } from "vitest"

import { suggestTags, type TagCount } from "./tags"

const tag = (name: string, count = 1, mine = true): TagCount => ({
  name,
  count,
  mine,
})

describe("suggestTags", () => {
  // Busiest first, as countTags hands them over, so "cobweb" arrives before
  // "website" and only the starts-with rule can put "website" first.
  const tags = [
    tag("cobweb", 14),
    tag("branding", 12),
    tag("website", 10),
    tag("ai", 9),
    tag("web3", 1, false),
  ]

  it("suggests nothing until you type", () => {
    expect(suggestTags(tags, "  ")).toEqual([])
  })

  it("puts tags that start with what you typed before ones that only contain it", () => {
    expect(suggestTags(tags, "web").map((t) => t.name)).toEqual([
      "website",
      "web3",
      "cobweb",
    ])
  })

  it("ignores case and a leading #", () => {
    expect(suggestTags(tags, "#BRAND").map((t) => t.name)).toEqual(["branding"])
  })

  it("matches the last word, so you can narrow a search that has several words", () => {
    expect(suggestTags(tags, "blue bra").map((t) => t.name)).toEqual([
      "branding",
    ])
  })

  it("leaves out the tag you're already looking at", () => {
    expect(
      suggestTags(tags, "web", { except: "website" }).map((t) => t.name)
    ).toEqual(["web3", "cobweb"])
  })

  it("shows at most six", () => {
    const many = Array.from({ length: 9 }, (_, i) => tag(`a${i}`))
    expect(suggestTags(many, "a")).toHaveLength(6)
  })
})
