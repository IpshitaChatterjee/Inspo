export type Kind = "image" | "video" | "link"

export type Item = {
  id: string
  kind: Kind
  name: string
  folder: string | null
  size: number
  addedAt: string
  width: number | null
  height: number | null
  title: string | null
  description: string | null
  source: string | null
  note: string
  tags: string[]
  /** Added by the Mac's image recognition; shown lighter than your own. */
  autoTags: string[]
  /** Text the Mac could read inside the image, for search. */
  text: string | null
  /** Main colours by name ("green", "black"…), biggest first. For search. */
  colors: string[]
  /** One swatch per colour, as hex. */
  palette: string[]
  version: number
}

export type Library = {
  items: Item[]
  folder: string
}

export type Patch = Partial<Pick<Item, "tags" | "autoTags" | "note" | "title">>

/** Your tags first, then auto tags you haven't already added yourself. */
export function allTagsOf(item: Item) {
  return [...item.tags, ...item.autoTags.filter((tag) => !item.tags.includes(tag))]
}

export function mediaUrl(item: Item, size: "thumb" | "large" | "orig") {
  return `/api/media?id=${encodeURIComponent(item.id)}&size=${size}&v=${item.version}`
}

export function hostOf(url: string | null) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Something went wrong (${res.status})`)
  return body as T
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

export const api = {
  library: () => request<Library>("/api/items"),
  update: (id: string, patch: Patch) => request("/api/items", json("PATCH", { id, ...patch })),
  remove: (id: string) =>
    request<{ undoId: string }>(`/api/items?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  restore: (undoId: string) => request<{ id: string }>("/api/restore", json("POST", { undoId })),
  capture: (url: string, tag: string | null) =>
    request<{ ids: string[]; title: string; savedMedia: boolean }>(
      "/api/capture",
      json("POST", { url, tags: tag ? [tag] : [] })
    ),
  upload: (file: File, tag: string | null) => {
    const params = new URLSearchParams({ name: file.name })
    if (tag) params.set("tag", tag)
    return request<{ id: string }>(`/api/upload?${params}`, { method: "POST", body: file })
  },
  renameTag: (from: string, to: string | null) => request("/api/tags", json("PATCH", { from, to })),
  reveal: (id?: string) => request("/api/reveal", json("POST", { id })),
}
