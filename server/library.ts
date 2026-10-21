import { EventEmitter } from "node:events"
import fs from "node:fs"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { analyze, autoTitle, IGNORED_TAGS } from "./analyze.ts"
import { captionTags } from "./caption-tags.ts"
import { captureUrl, extractUrls, type Capture } from "./capture.ts"
import { INBOX_DIR, INSPO_DIR, LIBRARY_FILE, TMP_DIR } from "./config.ts"
import { cachedDims, IMAGE_EXTS, measureAll, VIDEO_EXTS } from "./media.ts"
import {
  ensureDownloaded,
  errorMessage,
  hash,
  limiter,
  moveFile,
  run,
  slugify,
  stamp,
  uniquePath,
} from "./util.ts"

// The folder is the source of truth for media. _library.json (also in the
// folder, so it syncs) holds what the files can't: tags, titles, notes,
// where something came from, and link-only saves.

export type Kind = "image" | "video" | "link"

export type Meta = {
  tags?: string[]
  /** Old: categories were merged into tags. Read only to migrate. */
  category?: string | null
  note?: string
  title?: string
  description?: string
  source?: string
  addedAt?: string
  width?: number
  height?: number
  // Filled in by the Mac's image recognition.
  autoTags?: string[]
  autoTitle?: string
  text?: string
  colors?: string[]
  palette?: string[]
  /** Closest Google Fonts to the headline, best first. */
  fonts?: { family: string; weight: number }[]
  /** Caption tags have been added once; don't add them again after you remove some. */
  captionTagged?: boolean
  analyzedAt?: string
  analysisVersion?: number
}

type LibraryFile = {
  version: 2
  items: Record<string, Meta>
  /** Your tags for Components, by slug; replaces the tags a component was made with. */
  components?: Record<string, { tags?: string[] }>
  /** Named collections of inspos, each with its moodboard settings. */
  projects?: Record<string, Project>
}

/** Moodboard settings; the app owns their meaning, the library just keeps them. */
export type Board = Record<string, unknown>

export type Project = {
  id: string
  name: string
  createdAt: string
  archived?: boolean
  /** Item ids, in the order they were added. */
  items: string[]
  board?: Board
}

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
  autoTags: string[]
  text: string | null
  colors: string[]
  palette: string[]
  fonts: { family: string; weight: number }[]
  version: number
  /** Only in the published gallery: where its files are. */
  media?: { thumb: string; full: string | null }
}

type FileEntry = {
  rel: string
  abs: string
  ext: string
  kind: "image" | "video"
  size: number
  mtimeMs: number
  birthtimeMs: number
}

export const events = new EventEmitter()

let library: LibraryFile = { version: 2, items: {} }
// If the file exists but can't be read (say, mid-sync), never overwrite it.
let libraryReadable = true
let lastWritten = ""
let files = new Map<string, FileEntry>()

// ---------- Library file ----------

async function readLibrary() {
  let raw: string
  try {
    await ensureDownloaded(LIBRARY_FILE)
    raw = await fsp.readFile(LIBRARY_FILE, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      libraryReadable = true
      return
    }
    throw error
  }
  if (raw === lastWritten) return
  try {
    const parsed = JSON.parse(raw) as Partial<LibraryFile>
    library = {
      version: 2,
      items:
        parsed.items && typeof parsed.items === "object" ? parsed.items : {},
      components:
        parsed.components && typeof parsed.components === "object"
          ? parsed.components
          : {},
      projects:
        parsed.projects && typeof parsed.projects === "object"
          ? parsed.projects
          : {},
    }
    libraryReadable = true
    const merged = mergeCategoriesIntoTags()
    if (dropIgnoredAutoTags() || merged) await saveLibrary()
  } catch (error) {
    libraryReadable = false
    console.warn(
      `[library] ${LIBRARY_FILE} could not be read, not saving until it can: ${errorMessage(error)}`
    )
  }
}

// Categories used to exist alongside tags; now a category is just a tag.
function mergeCategoriesIntoTags() {
  let changed = false
  for (const meta of Object.values(library.items)) {
    if (!("category" in meta)) continue
    if (meta.category)
      meta.tags = cleanTags([...(meta.tags ?? []), meta.category])
    delete meta.category
    changed = true
  }
  return changed
}

// Clears auto tags that are now ignored, from items tagged before the rule.
function dropIgnoredAutoTags() {
  let changed = false
  for (const meta of Object.values(library.items)) {
    const kept = meta.autoTags?.filter((tag) => !IGNORED_TAGS.has(tag))
    if (kept && kept.length !== meta.autoTags!.length) {
      meta.autoTags = kept
      changed = true
    }
  }
  return changed
}

let writing: Promise<void> = Promise.resolve()

function saveLibrary() {
  writing = writing.then(async () => {
    if (!libraryReadable)
      throw new Error(
        "The library file is unreadable right now; try again in a moment."
      )
    const content = JSON.stringify(library, null, 2)
    const temp = `${LIBRARY_FILE}.tmp`
    await fsp.writeFile(temp, content)
    await fsp.rename(temp, LIBRARY_FILE)
    lastWritten = content
  })
  return writing
}

// ---------- Scanning the folder ----------

async function walk(
  dir: string,
  prefix: string,
  out: Map<string, FileEntry>,
  linkFiles: string[]
) {
  let entries: fs.Dirent[]
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue
    const abs = path.join(dir, entry.name)
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      await walk(abs, rel, out, linkFiles)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).slice(1).toLowerCase()
    if (ext === "webloc" || ext === "url") {
      linkFiles.push(abs)
      continue
    }
    const kind = IMAGE_EXTS.has(ext)
      ? "image"
      : VIDEO_EXTS.has(ext)
        ? "video"
        : null
    if (!kind) continue
    try {
      const stat = await fsp.stat(abs)
      out.set(rel, {
        rel,
        abs,
        ext,
        kind,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        birthtimeMs: stat.birthtimeMs,
      })
    } catch {
      // Vanished between readdir and stat.
    }
  }
}

let scanning: Promise<void> | null = null
let rescanWanted = false

export function scan(): Promise<void> {
  if (scanning) {
    rescanWanted = true
    return scanning
  }
  scanning = (async () => {
    do {
      rescanWanted = false
      await readLibrary().catch((error) =>
        console.warn(`[library] ${errorMessage(error)}`)
      )
      const next = new Map<string, FileEntry>()
      const linkFiles: string[] = []
      await walk(INSPO_DIR, "", next, linkFiles)
      files = next
      void processInbox(linkFiles)
      void measureAll([...next.values()]).then(
        (changed) => changed && notifyChanged()
      )
      void analyzeNew()
    } while (rescanWanted)
  })().finally(() => {
    scanning = null
  })
  return scanning
}

export async function ensureFolders() {
  await fsp.mkdir(INBOX_DIR, { recursive: true })
  await fsp.mkdir(TMP_DIR, { recursive: true })
}

let notifyTimer: NodeJS.Timeout | null = null
function notifyChanged() {
  if (notifyTimer) clearTimeout(notifyTimer)
  notifyTimer = setTimeout(() => events.emit("changed"), 150)
}

export function watch() {
  let timer: NodeJS.Timeout | null = null
  const watcher = fs.watch(
    INSPO_DIR,
    { recursive: true },
    (_event, filename) => {
      if (filename && path.basename(filename) === ".DS_Store") return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void scan().then(notifyChanged)
      }, 400)
    }
  )
  watcher.on("error", (error) => console.warn(`[watch] ${errorMessage(error)}`))
  // fs.watch can miss events on cloud folders, so also look every so often.
  setInterval(() => void scan().then(notifyChanged), 60_000)
}

// ---------- Reading ----------

export function getFile(id: string) {
  return files.get(id) ?? null
}

function cleanTags(tags: unknown) {
  if (!Array.isArray(tags)) return []
  const seen = new Set<string>()
  for (const tag of tags) {
    const clean = String(tag).trim().toLowerCase().replace(/\s+/g, " ")
    if (clean) seen.add(clean)
  }
  return [...seen]
}

export async function listItems() {
  const items: Item[] = []
  for (const file of files.values()) {
    const meta = library.items[file.rel] ?? {}
    const folder = file.rel.includes("/") ? file.rel.split("/")[0] : null
    const measured = await cachedDims(file)
    items.push({
      id: file.rel,
      kind: file.kind,
      name: path.basename(file.rel),
      folder,
      size: file.size,
      addedAt:
        meta.addedAt ??
        new Date(file.birthtimeMs || file.mtimeMs).toISOString(),
      width: meta.width ?? measured?.[0] ?? null,
      height: meta.height ?? measured?.[1] ?? null,
      // Your own title wins; otherwise the one worked out from the image.
      title: meta.title ?? meta.autoTitle ?? null,
      description: meta.description ?? null,
      source: meta.source ?? null,
      note: meta.note ?? "",
      tags: cleanTags(meta.tags),
      autoTags: cleanTags(meta.autoTags),
      text: meta.text ?? null,
      colors: meta.colors ?? [],
      palette: meta.palette ?? [],
      fonts: meta.fonts ?? [],
      version: Math.round(file.mtimeMs),
    })
  }
  for (const [id, meta] of Object.entries(library.items)) {
    if (!id.startsWith("link:")) continue
    items.push({
      id,
      kind: "link",
      name: meta.title ?? meta.source ?? id,
      folder: null,
      size: 0,
      addedAt: meta.addedAt ?? new Date(0).toISOString(),
      width: null,
      height: null,
      title: meta.title ?? null,
      description: meta.description ?? null,
      source: meta.source ?? null,
      note: meta.note ?? "",
      tags: cleanTags(meta.tags),
      autoTags: cleanTags(meta.autoTags),
      text: null,
      colors: [],
      palette: [],
      fonts: [],
      version: 0,
    })
  }
  items.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  const known = new Set(items.map((item) => item.id))
  const projects = Object.values(library.projects ?? {})
    .map((project) => ({
      ...project,
      items: project.items.filter((id) => known.has(id)),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { items, folder: INSPO_DIR, componentTags: componentTags(), projects }
}

// ---------- Changing ----------

export type Patch = Pick<Meta, "tags" | "autoTags" | "note" | "title">

export async function updateItem(id: string, patch: Patch) {
  if (!files.has(id) && !library.items[id])
    throw new Error("That item no longer exists.")
  const meta = (library.items[id] ??= {})
  if (patch.tags !== undefined) meta.tags = cleanTags(patch.tags)
  if (patch.autoTags !== undefined) meta.autoTags = cleanTags(patch.autoTags)
  if (patch.note !== undefined) meta.note = String(patch.note)
  if (patch.title !== undefined)
    meta.title = (patch.title ?? "").toString().trim() || undefined
  await saveLibrary()
  notifyChanged()
}

/** Renames a tag on every item (yours and auto ones), or removes it when `to` is null. */
export async function renameTag(from: string, to: string | null) {
  const source = from.trim().toLowerCase()
  const target = to?.trim().toLowerCase() || null
  for (const meta of Object.values(library.items)) {
    for (const key of ["tags", "autoTags"] as const) {
      const list = meta[key]
      if (!list?.includes(source)) continue
      meta[key] = cleanTags(
        list.map((tag) => (tag === source ? target : tag)).filter(Boolean)
      )
    }
    // Don't show the same tag twice once it's become one of yours.
    if (meta.autoTags && meta.tags)
      meta.autoTags = meta.autoTags.filter((tag) => !meta.tags!.includes(tag))
  }
  await saveLibrary()
  notifyChanged()
}

/** Your tag changes for Components, by slug (only the ones you've changed). */
function componentTags() {
  const tags: Record<string, string[]> = {}
  for (const [slug, entry] of Object.entries(library.components ?? {})) {
    if (entry.tags) tags[slug] = cleanTags(entry.tags)
  }
  return tags
}

export async function setComponentTags(slug: string, tags: unknown) {
  if (!/^[a-z0-9-]+$/.test(slug))
    throw new Error("That component doesn't exist.")
  library.components ??= {}
  library.components[slug] = { tags: cleanTags(tags) }
  await saveLibrary()
  notifyChanged()
}

// ---------- Projects ----------

function project(id: string) {
  const found = library.projects?.[id]
  if (!found) throw new Error("That project no longer exists.")
  return found
}

function projectName(name: unknown) {
  const clean = String(name ?? "")
    .trim()
    .slice(0, 80)
  if (!clean) throw new Error("A project needs a name.")
  return clean
}

export async function createProject(name: unknown, items: unknown = []) {
  library.projects ??= {}
  const created: Project = {
    id: hash(`${name}${Date.now()}${Math.random()}`),
    name: projectName(name),
    createdAt: new Date().toISOString(),
    items: [...new Set(Array.isArray(items) ? items.map(String) : [])],
  }
  library.projects[created.id] = created
  await saveLibrary()
  notifyChanged()
  return created
}

export async function updateProject(
  id: string,
  patch: { name?: unknown; archived?: unknown; board?: unknown }
) {
  const found = project(id)
  if (patch.name !== undefined) found.name = projectName(patch.name)
  if (patch.archived !== undefined) found.archived = Boolean(patch.archived)
  if (patch.board !== undefined) {
    if (!patch.board || typeof patch.board !== "object")
      throw new Error("Those board settings don't make sense.")
    found.board = patch.board as Board
  }
  await saveLibrary()
  notifyChanged()
  return found
}

/** Adds and removes items; the inspos themselves are never touched. */
export async function changeProjectItems(
  id: string,
  add: unknown,
  remove: unknown
) {
  const found = project(id)
  const removing = new Set(Array.isArray(remove) ? remove.map(String) : [])
  found.items = found.items.filter((item) => !removing.has(item))
  for (const item of Array.isArray(add) ? add.map(String) : []) {
    if (!found.items.includes(item)) found.items.push(item)
  }
  await saveLibrary()
  notifyChanged()
  return found
}

/** Removes the project and its board. Returns it so the app can offer Undo. */
export async function deleteProject(id: string) {
  const found = project(id)
  delete library.projects![id]
  await saveLibrary()
  notifyChanged()
  return found
}

export async function restoreProject(saved: unknown) {
  const candidate = saved as Partial<Project>
  if (!candidate?.id || !Array.isArray(candidate.items))
    throw new Error("That project can't be restored.")
  library.projects ??= {}
  library.projects[candidate.id] = {
    id: String(candidate.id),
    name: projectName(candidate.name),
    createdAt: String(candidate.createdAt ?? new Date().toISOString()),
    archived: Boolean(candidate.archived),
    items: candidate.items.map(String),
    board: candidate.board,
  }
  await saveLibrary()
  notifyChanged()
}

// Recent deletions, kept for a while so they can be undone with everything intact.
type Deleted = {
  projects?: string[]
  id: string
  meta: Meta | undefined
  from?: string
  trashed?: string
}
const recentlyDeleted = new Map<string, Deleted>()
const UNDO_FOR_MS = 10 * 60_000

/** Moves a file to the Mac's Bin (recoverable), or forgets a saved link. */
export async function deleteItem(id: string) {
  const file = files.get(id)
  const deleted: Deleted = { id, meta: library.items[id] }
  if (file) {
    const trash = path.join(os.homedir(), ".Trash")
    const base = path.basename(file.abs, `.${file.ext}`)
    const target = await uniquePath(trash, base, file.ext)
    await moveFile(file.abs, target)
    files.delete(id)
    Object.assign(deleted, { from: file.abs, trashed: target })
  } else if (!library.items[id]) {
    throw new Error("That item no longer exists.")
  }
  delete library.items[id]
  // Leaves every project it was in; Undo puts it back in them.
  deleted.projects = []
  for (const project of Object.values(library.projects ?? {})) {
    if (!project.items.includes(id)) continue
    project.items = project.items.filter((other) => other !== id)
    deleted.projects.push(project.id)
  }
  await saveLibrary()
  notifyChanged()

  const undoId = hash(id + Date.now())
  recentlyDeleted.set(undoId, deleted)
  setTimeout(() => recentlyDeleted.delete(undoId), UNDO_FOR_MS)
  return undoId
}

/** Puts a deleted item back where it was, tags and all. */
export async function restoreItem(undoId: string) {
  const deleted = recentlyDeleted.get(undoId)
  if (!deleted)
    throw new Error("That can't be undone any more. It's still in the Bin.")
  let id = deleted.id
  if (deleted.from && deleted.trashed) {
    const ext = path.extname(deleted.from).slice(1)
    const target = await uniquePath(
      path.dirname(deleted.from),
      path.basename(deleted.from, `.${ext}`),
      ext
    )
    await moveFile(deleted.trashed, target)
    id = path.relative(INSPO_DIR, target)
  }
  if (deleted.meta) library.items[id] = deleted.meta
  for (const projectId of deleted.projects ?? []) {
    const project = library.projects?.[projectId]
    if (project && !project.items.includes(id)) project.items.push(id)
  }
  recentlyDeleted.delete(undoId)
  await saveLibrary()
  await scan()
  notifyChanged()
  return id
}

export async function reveal(id: string) {
  const file = files.get(id)
  await run("open", file ? ["-R", file.abs] : [INSPO_DIR])
}

// ---------- Auto-tagging ----------

const analyzeQueue = limiter(2)
// Bump when analysis learns something new, so older items get looked at again.
const ANALYSIS_VERSION = 11
let analyzing = false

/** Tags every file that hasn't been looked at yet, a couple at a time. */
async function analyzeNew() {
  if (analyzing) return
  analyzing = true
  try {
    const pending = [...files.values()].filter(
      (file) =>
        (library.items[file.rel]?.analysisVersion ?? 0) < ANALYSIS_VERSION
    )
    let unsaved = 0
    await Promise.all(
      pending.map((file) =>
        analyzeQueue(async () => {
          let result
          try {
            result = await analyze(file)
          } catch (error) {
            console.warn(`[analyze] ${file.rel}: ${errorMessage(error)}`)
            return // Try again on the next scan.
          }
          if (!files.has(file.rel)) return
          const meta = (library.items[file.rel] ??= {})
          // Re-runs keep the auto tags as they are, so ones you removed stay removed.
          const own = cleanTags(meta.tags)
          if (!meta.analyzedAt) meta.autoTags = result.tags
          // Words from the caption say more than "document", so they go first.
          if (!meta.captionTagged) {
            meta.autoTags = cleanTags([
              ...captionTags(meta.description),
              ...(meta.autoTags ?? []),
            ])
            meta.captionTagged = true
          }
          meta.autoTags = (meta.autoTags ?? []).filter(
            (tag) => !own.includes(tag)
          )
          // Tweets saved before v3 were titled with the author's name; let the image speak instead.
          if (meta.title && /^.+ \(@\w+\)$/.test(meta.title)) {
            if (!meta.description?.startsWith(meta.title)) {
              meta.description = [meta.title, meta.description]
                .filter(Boolean)
                .join(" — ")
            }
            delete meta.title
          }
          meta.autoTitle =
            autoTitle(result, meta.description, file.kind === "video") ??
            undefined
          meta.text = result.text || undefined
          meta.colors = result.colors.names
          meta.palette = result.colors.palette
          meta.fonts = result.fonts.map(({ family, weight }) => ({
            family,
            weight,
          }))
          meta.analyzedAt = new Date().toISOString()
          meta.analysisVersion = ANALYSIS_VERSION
          // Save in batches so a big first run doesn't rewrite the file thousands of times.
          if (++unsaved >= 20) {
            unsaved = 0
            await saveLibrary()
            notifyChanged()
          }
        })
      )
    )
    if (unsaved) {
      await saveLibrary()
      notifyChanged()
    }
  } catch (error) {
    console.warn(`[analyze] ${errorMessage(error)}`)
  } finally {
    analyzing = false
  }
}

// ---------- Adding ----------

type Extra = { tags?: string[] }

/** Moves a finished temp file into the folder and records its details. */
export async function placeFile(
  tempPath: string,
  baseName: string,
  ext: string,
  meta: Meta
) {
  const target = await uniquePath(INSPO_DIR, slugify(baseName, 80), ext)
  const rel = path.relative(INSPO_DIR, target)
  library.items[rel] = { addedAt: new Date().toISOString(), ...meta }
  // Write the details first, so the file never shows up without them.
  await saveLibrary()
  await moveFile(tempPath, target)
  return rel
}

export async function addUpload(
  tempPath: string,
  originalName: string,
  extra: Extra
) {
  const ext = path.extname(originalName).slice(1).toLowerCase()
  if (!IMAGE_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) {
    await fsp.rm(tempPath, { force: true })
    throw new Error(
      `${originalName} isn't an image or video this app can show.`
    )
  }
  const base = path.basename(originalName, path.extname(originalName))
  const rel = await placeFile(tempPath, base, ext, {
    tags: cleanTags(extra.tags),
  })
  await scan()
  notifyChanged()
  return rel
}

const capturing = new Set<string>()
const LINK_FILE_EXTS = new Set(["txt", "text", "md", "url", "webloc", ""])

/** Saves whatever a link points to. Always keeps at least the link itself. */
export async function addLink(url: string, extra: Extra = {}) {
  let capture: Capture
  try {
    capture = await captureUrl(url)
  } catch (error) {
    console.warn(`[capture] ${url}: ${errorMessage(error)}`)
    capture = { url, files: [] }
  }

  const shared: Meta = {
    source: capture.url,
    title: capture.title,
    description: capture.description,
    tags: cleanTags(extra.tags),
  }

  const ids: string[] = []
  const host = new URL(capture.url).hostname.replace(/^www\./, "")
  const base = `${slugify(capture.title ?? host, 40)}-${stamp()}`
  for (const file of capture.files) {
    ids.push(
      await placeFile(file.tempPath, base, file.ext, {
        ...shared,
        width: file.width,
        height: file.height,
      })
    )
  }
  if (!ids.length) {
    // Links aren't image-analysed, so their caption tags are added right away.
    const id = `link:${hash(capture.url)}`
    library.items[id] = {
      addedAt: new Date().toISOString(),
      ...library.items[id],
      ...shared,
      autoTags: captionTags(capture.description).filter(
        (tag) => !shared.tags?.includes(tag)
      ),
      captionTagged: true,
    }
    await saveLibrary()
    ids.push(id)
  }
  await scan()
  notifyChanged()
  return {
    ids,
    title: capture.title ?? host,
    savedMedia: capture.files.length > 0,
  }
}

// Link files dropped into _inbox (or .webloc/.url files anywhere) get saved,
// then the link file is cleared away.
async function processInbox(linkFiles: string[]) {
  let inboxFiles: string[] = []
  try {
    inboxFiles = (await fsp.readdir(INBOX_DIR))
      .filter((name) => !name.startsWith("."))
      .map((name) => path.join(INBOX_DIR, name))
  } catch {
    // No inbox yet.
  }
  for (const file of [...inboxFiles, ...linkFiles]) {
    if (capturing.has(file)) continue
    capturing.add(file)
    try {
      const ext = path.extname(file).slice(1).toLowerCase()
      // A picture saved straight into the inbox just moves into the library.
      if (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)) {
        const base = path.basename(file, path.extname(file))
        await placeFile(file, base, ext, {})
        events.emit("toast", { message: `Saved ${base}` })
        continue
      }
      if (!LINK_FILE_EXTS.has(ext)) continue
      const urls = extractUrls(await readLinkFile(file, ext))
      // Leave anything that isn't a link alone rather than deleting it.
      if (!urls.length) continue
      for (const url of urls) {
        const result = await addLink(url)
        events.emit("toast", { message: `Saved “${result.title}”` })
      }
      await fsp.rm(file, { force: true })
    } catch (error) {
      console.warn(`[inbox] ${file}: ${errorMessage(error)}`)
    } finally {
      capturing.delete(file)
    }
  }
}

async function readLinkFile(file: string, ext: string) {
  await ensureDownloaded(file)
  // .webloc files can be binary property lists; plutil turns them into text.
  if (ext === "webloc")
    return run("plutil", ["-convert", "xml1", "-o", "-", file])
  return fsp.readFile(file, "utf8")
}
