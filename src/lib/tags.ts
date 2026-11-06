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

const SUGGESTIONS = 6

/** Tags matching the last word typed in search: ones that start with it first, then ones that contain it. */
export function suggestTags(
  tags: TagCount[],
  query: string,
  { except }: { except?: string } = {}
): TagCount[] {
  const word = (query.trim().split(/\s+/).pop() ?? "")
    .replace(/^#/, "")
    .toLowerCase()
  if (!word) return []
  const candidates = tags.filter(
    (tag) => tag.name !== except && tag.name.includes(word)
  )
  return [
    ...candidates.filter((tag) => tag.name.startsWith(word)),
    ...candidates.filter((tag) => !tag.name.startsWith(word)),
  ].slice(0, SUGGESTIONS)
}
