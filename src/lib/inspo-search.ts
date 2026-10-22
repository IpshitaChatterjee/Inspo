import { allTagsOf, hostOf, type Item } from "@/lib/api"

// Colour words people use, mapped to the names the Mac gives colours.
// Teal reads as green to some eyes and blue to others, so it counts for both.
const COLOR_WORDS: Record<string, string[]> = {
  red: ["red"],
  orange: ["orange"],
  yellow: ["yellow"],
  green: ["green", "teal"],
  teal: ["teal"],
  cyan: ["teal"],
  turquoise: ["teal"],
  blue: ["blue", "teal"],
  purple: ["purple"],
  violet: ["purple"],
  pink: ["pink"],
  brown: ["brown"],
  beige: ["beige"],
  cream: ["beige"],
  black: ["black"],
  dark: ["black"],
  white: ["white"],
  light: ["white"],
  gray: ["gray"],
  grey: ["gray"],
}

/** Whether an inspo fits the search: every word must hit its text, tags, fonts or colours. */
export function matches(item: Item, query: string) {
  if (!query) return true
  const haystack = [
    item.title,
    item.description,
    item.note,
    item.name,
    item.text,
    hostOf(item.source),
    ...item.fonts.map((font) => font.family),
    ...allTagsOf(item),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((raw) => {
      const word = raw.replace(/^#/, "")
      const colors = COLOR_WORDS[word]
      if (colors) return colors.some((color) => item.colors.includes(color))
      return haystack.includes(word)
    })
}
