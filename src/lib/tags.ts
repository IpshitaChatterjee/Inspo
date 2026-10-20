import { allTagsOf, type Item } from "@/lib/api"

export type TagCount = { name: string; count: number; mine: boolean }

/** Every tag with how many items carry it: your own tags first, then auto ones, busiest first. */
export function countTags(
  items: Pick<Item, "tags" | "autoTags">[]
): TagCount[] {
  const counts = new Map<string, TagCount>()
  for (const item of items) {
    for (const tag of allTagsOf(item)) {
      const entry = counts.get(tag) ?? { name: tag, count: 0, mine: false }
      entry.count++
      if (item.tags.includes(tag)) entry.mine = true
      counts.set(tag, entry)
    }
  }
  return [...counts.values()].sort(
    (a, b) =>
      Number(b.mine) - Number(a.mine) ||
      b.count - a.count ||
      a.name.localeCompare(b.name)
  )
}
