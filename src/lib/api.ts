import type { Board, Project } from "@/lib/projects"

export type Kind = "image" | "video" | "link"

/** The published, read-only copy: browse and search only, data comes from files. */
export const GALLERY = import.meta.env.MODE === "gallery"

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
  /** Closest Google Fonts to the image's headline, best first (empty when unsure). */
  fonts: { family: string; weight: number }[]
  version: number
  /** Only in the published gallery: where its files are. */
  media?: { thumb: string; full: string | null }
}

export type PublishState = {
  status: "idle" | "publishing" | "error"
  url?: string
  publishedAt?: string
  items?: number
  files?: number
  fileLimit?: number
  error?: string
  pending?: boolean
  /** Whether editor mode in the gallery has a password. */
  editing?: boolean
}

/** How full the shared gallery is (0–1), once it has been published. */
export function galleryFullness(state: PublishState | null) {
  return state?.files && state.fileLimit ? state.files / state.fileLimit : 0
}

export const GALLERY_WARN_AT = 0.8

export type Library = {
  items: Item[]
  folder: string
  /** Your tags for Components, by slug, where you've changed them. */
  componentTags?: Record<string, string[]>
  projects?: Project[]
}

export type Patch = Partial<Pick<Item, "tags" | "autoTags" | "note" | "title">>

/** Your tags first, then auto tags you haven't already added yourself. */
export function allTagsOf(item: Pick<Item, "tags" | "autoTags">) {
  return [
    ...item.tags,
    ...item.autoTags.filter((tag) => !item.tags.includes(tag)),
  ]
}

export function mediaUrl(item: Item, size: "thumb" | "large" | "orig") {
  if (item.media)
    return `/m/${size === "thumb" ? item.media.thumb : (item.media.full ?? item.media.thumb)}`
  return `/api/media?id=${encodeURIComponent(item.id)}&size=${size}&v=${item.version}`
}

/** Whether a video can actually play (a too-long one may be published as a still). */
export function hasPlayableVideo(item: Item) {
  return item.kind === "video" && (!item.media || !!item.media.full)
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
  if (!res.ok)
    throw new Error(body.error ?? `Something went wrong (${res.status})`)
  return body as T
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

export const api = {
  library: () =>
    GALLERY
      ? request<Library>("/data.json", { cache: "no-cache" })
      : request<Library>("/api/items"),
  update: (id: string, patch: Patch) =>
    request("/api/items", json("PATCH", { id, ...patch })),
  remove: (id: string) =>
    request<{ undoId: string }>(`/api/items?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  restore: (undoId: string) =>
    request<{ id: string }>("/api/restore", json("POST", { undoId })),
  capture: (url: string, tag: string | null) =>
    request<{ ids: string[]; title: string; savedMedia: boolean }>(
      "/api/capture",
      json("POST", { url, tags: tag ? [tag] : [] })
    ),
  upload: (file: File, tag: string | null) => {
    const params = new URLSearchParams({ name: file.name })
    if (tag) params.set("tag", tag)
    return request<{ id: string }>(`/api/upload?${params}`, {
      method: "POST",
      body: file,
    })
  },
  renameTag: (from: string, to: string | null) =>
    request("/api/tags", json("PATCH", { from, to })),
  setComponentTags: (slug: string, tags: string[]) =>
    request("/api/components", json("PATCH", { slug, tags })),
  createProject: (name: string, items: string[]) =>
    request<Project>("/api/projects", json("POST", { name, items })),
  updateProject: (
    id: string,
    patch: { name?: string; archived?: boolean; board?: Partial<Board> }
  ) => request<Project>("/api/projects", json("PATCH", { id, ...patch })),
  changeProjectItems: (id: string, add: string[], remove: string[]) =>
    request<Project>("/api/projects/items", json("POST", { id, add, remove })),
  deleteProject: (id: string) =>
    request<Project>(`/api/projects?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  restoreProject: (project: Project) =>
    request("/api/projects/restore", json("POST", { project })),
  reveal: (id?: string) => request("/api/reveal", json("POST", { id })),
  publishState: () => request<PublishState>("/api/publish"),
  publish: () => request<PublishState>("/api/publish", { method: "POST" }),
  setEditingPassword: (password: string | null) =>
    request<PublishState>("/api/publish/password", json("POST", { password })),
}
