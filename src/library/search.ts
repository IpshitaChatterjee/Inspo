import { countTags, type TagCount, type View } from "@/components/app-sidebar"
import type { LibraryEntry } from "./index"

/** Components in the chosen tag view whose title, description or tags contain every word typed. */
export function filterComponents(
  entries: LibraryEntry[],
  view: View,
  query: string
): LibraryEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return entries.filter(({ meta }) => {
    if (view.kind === "untagged" && meta.tags.length > 0) return false
    if (view.kind === "tag" && !meta.tags.includes(view.name)) return false
    if (!words.length) return true
    const haystack = [meta.title, meta.description, ...meta.tags]
      .join(" ")
      .toLowerCase()
    return words.every((raw) => haystack.includes(raw.replace(/^#/, "")))
  })
}

/** Every tag with how many components carry it. Components only have tags you chose. */
export function componentTagCounts(entries: LibraryEntry[]): TagCount[] {
  return countTags(entries.map((e) => ({ tags: e.meta.tags, autoTags: [] })))
}
