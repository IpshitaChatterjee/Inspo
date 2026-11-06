import { spawn } from "node:child_process"
import crypto from "node:crypto"
import { EventEmitter } from "node:events"
import fsp from "node:fs/promises"
import path from "node:path"

import { CACHE_DIR } from "./config.ts"
import {
  deleteItem,
  getFile,
  listItems,
  setComponentTags,
  updateItem,
  type Item,
} from "./library.ts"
import { mediaFile, VIDEO_EXTS } from "./media.ts"
import { ensureDownloaded, errorMessage, exists, hash, run } from "./util.ts"

// Publishes a read-only copy of the library to Cloudflare, so it can be
// browsed from any phone or shared with a link. The copy is built here on the
// Mac: the gallery version of the app, a data.json, and the media files.
// Media file names are based on content, so each publish only uploads what's new.

const ROOT = path.resolve(import.meta.dirname, "..")
// Run the tools with this same Node, so it works however the app was started.
const VITE = path.join(ROOT, "node_modules/vite/bin/vite.js")
const WRANGLER = path.join(ROOT, "node_modules/wrangler/bin/wrangler.js")
const SITE_DIR = path.join(CACHE_DIR, "site")
const MEDIA_DIR = path.join(SITE_DIR, "m")
const BUILD_DIR = path.join(CACHE_DIR, "gallery-build")
const STATE_FILE = path.join(CACHE_DIR, "publish.json")
const WORKER_CONFIG = path.join(CACHE_DIR, "wrangler.json")
// Handles editor mode in the gallery; everything else is static files.
const WORKER_SCRIPT = path.join(ROOT, "gallery-worker/index.js")
// Copied next to the site, so the GitHub copy holds everything Cloudflare needs.
const WORKER_COPY = path.join(CACHE_DIR, "worker.js")
const GALLERY_GIT_DIR = path.join(CACHE_DIR, "gallery.git")
// The page and the data change with every publish, so they show when it's live.
const LIVE_FILES = ["index.html", "data.json"]
const LIVE_WAIT_MS = 20 * 60_000
const LIVE_CHECK_MS = 20_000
const KEYCHAIN_SERVICE = "inspo-gallery"
// How often the Mac collects edits made in the gallery.
const PULL_EVERY_MS = 3 * 60_000

const PROJECT = process.env.INSPO_SITE_NAME ?? "inspo"
// Private GitHub copy ("owner/name") that Cloudflare publishes from. When set,
// publishing needs only the Mac's GitHub sign-in, not its Cloudflare one, which
// keeps running out (a renewal that fails while the Mac sleeps breaks it).
const GALLERY_REPO = process.env.INSPO_GALLERY_REPO
// Cloudflare's free plan: 25 MiB per file, 20,000 files per site.
const MAX_FILE_BYTES = 25 * 1024 * 1024
export const FILE_LIMIT = 20_000
// Stop a little short of the limit, so a publish never fails halfway.
const MAX_FILES = 19_500
// Publish once things have been quiet for a while, and not too often
// (the free plan allows about 500 updates a month).
const QUIET_MS = 10 * 60_000
const MIN_GAP_MS = 2 * 60 * 60_000

const BROWSER_IMAGES = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "svg",
])
const BROWSER_VIDEOS = new Set(["mp4", "m4v", "webm", "mov"])

export type PublishState = {
  status: "idle" | "publishing" | "error"
  url?: string
  publishedAt?: string
  items?: number
  /** Files in the published site, against Cloudflare's free limit. */
  files?: number
  fileLimit?: number
  error?: string
  pending?: boolean
  /** Whether the gallery has an editing password. */
  editing?: boolean
  signature?: string
  /** Cloudflare storage holding edits made in the gallery. */
  kvId?: string
  /** Gallery edits applied here, cleared once a publish includes them. */
  appliedEditIds?: string[]
}

export const publishEvents = new EventEmitter()

let state: PublishState = { status: "idle" }
let timer: NodeJS.Timeout | null = null
let running = false

export async function loadPublishState() {
  try {
    state = {
      ...JSON.parse(await fsp.readFile(STATE_FILE, "utf8")),
      status: "idle",
    }
  } catch {
    state = { status: "idle" }
  }
}

export function publishState() {
  const visible = { ...state }
  delete visible.signature
  delete visible.kvId
  delete visible.appliedEditIds
  return visible
}

async function setState(patch: Partial<PublishState>) {
  state = { ...state, ...patch }
  await fsp.mkdir(CACHE_DIR, { recursive: true })
  await fsp.writeFile(STATE_FILE, JSON.stringify(state, null, 2))
  publishEvents.emit("change", publishState())
}

/** Something changed: publish later, once it's quiet and not too soon after the last one. */
export function schedulePublish() {
  if (!state.publishedAt && !state.url) return // Not set up yet; the first publish is manual.
  if (!state.pending) void setState({ pending: true })
  if (timer) clearTimeout(timer)
  const sinceLast = Date.now() - new Date(state.publishedAt ?? 0).getTime()
  const wait = Math.max(QUIET_MS, MIN_GAP_MS - sinceLast)
  timer = setTimeout(() => void publishNow(), wait)
}

export async function publishNow() {
  if (running) return publishState()
  running = true
  if (timer) clearTimeout(timer)
  await setState({ status: "publishing", error: undefined })
  try {
    const { signature, count, files } = await buildSite()
    if (signature === state.signature && state.url) {
      // Nothing visible changed since the last publish.
      await setState({
        status: "idle",
        pending: false,
        files,
        fileLimit: FILE_LIMIT,
      })
      await clearAppliedEdits()
    } else {
      const url = GALLERY_REPO
        ? await publishViaGitHub(GALLERY_REPO)
        : await deploy()
      await setState({
        status: "idle",
        pending: false,
        url,
        items: count,
        files,
        fileLimit: FILE_LIMIT,
        signature,
        publishedAt: new Date().toISOString(),
      })
      await clearAppliedEdits()
    }
  } catch (error) {
    console.warn(`[publish] ${errorMessage(error)}`)
    await setState({ status: "error", error: friendlyError(error) })
  } finally {
    running = false
  }
  return publishState()
}

// Shown in the sidebar, so it must stay short and human. The full output is in the log.
export function friendlyError(error: unknown) {
  const message = errorMessage(error)
  const text = `${message} ${(error as { output?: string }).output ?? ""}`
  // Checked before Cloudflare, whose sign-in words ("login", "authentication") git also uses.
  if (
    /could not read Username|gh auth login|Authentication failed for 'https:\/\/github/i.test(
      text
    )
  )
    return "Signed out of GitHub."
  if (/Could not resolve host|unable to access 'https:\/\/github/i.test(text))
    return "Offline. Will try again with the next change."
  // When wrangler's saved sign-in has run out, it asks for CLOUDFLARE_API_TOKEN instead of saying so.
  if (/not logged in|authenticat|login|CLOUDFLARE_API_TOKEN/i.test(text))
    return "Signed out of Cloudflare."
  if (/too many files|file count/i.test(text))
    return "The gallery has more files than Cloudflare's free plan allows."
  if (message.startsWith("Command failed"))
    return "Couldn't publish. Try again in a bit."
  return message.split("\n")[0].slice(0, 200)
}

// ---------- Building the site ----------

async function buildSite() {
  // The gallery version of the app: same look, no editing.
  await run(
    process.execPath,
    [
      VITE,
      "build",
      "--mode",
      "gallery",
      "--outDir",
      BUILD_DIR,
      "--emptyOutDir",
    ],
    5 * 60_000,
    ROOT
  )

  await fsp.mkdir(MEDIA_DIR, { recursive: true })
  const { items, componentTags } = await listItems()
  const keep = new Set<string>()
  const published: Item[] = []

  for (const item of items) {
    const key = publicId(item)
    if (!key) continue
    if (item.kind === "link") {
      published.push(toPublic(item, key))
      continue
    }
    const file = getFile(item.id)!
    try {
      const media = await exportMedia(file, key)
      if (!media) continue
      Object.values(media).forEach((name) => name && keep.add(name))
      published.push({ ...toPublic(item, key), media })
    } catch (error) {
      console.warn(`[publish] skipped ${item.id}: ${errorMessage(error)}`)
    }
  }

  // Remove media for things that were deleted.
  for (const name of await fsp.readdir(MEDIA_DIR)) {
    if (!keep.has(name))
      await fsp.rm(path.join(MEDIA_DIR, name), { force: true })
  }

  // Swap in the freshly built app (everything except the media folder).
  for (const name of await fsp.readdir(SITE_DIR)) {
    if (name !== "m")
      await fsp.rm(path.join(SITE_DIR, name), { recursive: true, force: true })
  }
  await fsp.cp(BUILD_DIR, SITE_DIR, { recursive: true })

  const data = JSON.stringify({ items: published, folder: "", componentTags })
  await fsp.writeFile(path.join(SITE_DIR, "data.json"), data)
  await fsp.writeFile(
    path.join(SITE_DIR, "_headers"),
    [
      "/m/*",
      "  Cache-Control: public, max-age=31536000, immutable",
      "/data.json",
      "  Cache-Control: no-cache",
      "",
    ].join("\n")
  )

  const fileCount = await countFiles(SITE_DIR)
  if (fileCount > MAX_FILES) {
    throw new Error(
      `The gallery has ${fileCount} files, more than Cloudflare's free plan allows (20,000).`
    )
  }
  const assets = (await fsp.readdir(path.join(BUILD_DIR, "assets")))
    .sort()
    .join(",")
  // A change to the editor-mode script also needs a publish.
  const script = await fsp.readFile(WORKER_SCRIPT, "utf8")
  return {
    signature: hash(data + assets + script),
    count: published.length,
    files: fileCount,
  }
}

async function countFiles(dir: string): Promise<number> {
  let total = 0
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    total += entry.isDirectory()
      ? await countFiles(path.join(dir, entry.name))
      : 1
  }
  return total
}

/** The item's id in the gallery: stable while the file is unchanged, and reveals no file names. */
function publicId(item: Item) {
  if (item.kind === "link") return `link-${hash(item.id)}`
  const file = getFile(item.id)
  return file ? hash(`${file.rel}|${file.size}|${file.mtimeMs}`) : null
}

/** What visitors may see. Notes stay private, and file names aren't needed. */
function toPublic(item: Item, id: string): Item {
  return { ...item, id, name: "", folder: null, note: "", size: 0 }
}

type Source = NonNullable<ReturnType<typeof getFile>>

async function exportMedia(file: Source, key: string) {
  await ensureDownloaded(file.abs)
  const thumbSource = await mediaFile(file, "thumb")
  if (!thumbSource) return null
  const thumb = `${key}-t${path.extname(thumbSource).toLowerCase()}`
  await copyOnce(thumbSource, thumb)

  const full = VIDEO_EXTS.has(file.ext)
    ? await exportVideo(file, key)
    : await exportImage(file, key)
  return { thumb, full }
}

async function copyOnce(from: string, name: string) {
  const target = path.join(MEDIA_DIR, name)
  if (!(await exists(target))) await fsp.copyFile(from, target)
}

async function sizeOf(file: string) {
  return (await fsp.stat(file)).size
}

// Full resolution whenever it fits; otherwise the sharpest JPEG that does.
async function exportImage(file: Source, key: string) {
  if (BROWSER_IMAGES.has(file.ext) && file.size <= MAX_FILE_BYTES) {
    const name = `${key}.${file.ext}`
    await copyOnce(file.abs, name)
    return name
  }
  const name = `${key}.jpg`
  const target = path.join(MEDIA_DIR, name)
  if (await exists(target)) return name
  for (const maxSide of [0, 6000, 4000, 3000]) {
    const resize = maxSide ? ["-Z", String(maxSide)] : []
    await run(
      "sips",
      [
        ...resize,
        "-s",
        "format",
        "jpeg",
        "-s",
        "formatOptions",
        "90",
        file.abs,
        "--out",
        target,
      ],
      120_000
    )
    if ((await sizeOf(target)) <= MAX_FILE_BYTES) return name
  }
  await fsp.rm(target, { force: true })
  return null
}

// The original if it fits; otherwise re-encoded by macOS at 1080p, then 720p.
async function exportVideo(file: Source, key: string) {
  if (BROWSER_VIDEOS.has(file.ext) && file.size <= MAX_FILE_BYTES) {
    const name = `${key}.${file.ext}`
    await copyOnce(file.abs, name)
    return name
  }
  const name = `${key}.mp4`
  const target = path.join(MEDIA_DIR, name)
  if (await exists(target)) return name
  for (const preset of ["Preset1920x1080", "Preset1280x720"]) {
    await run(
      "avconvert",
      [
        "--source",
        file.abs,
        "--preset",
        preset,
        "--output",
        target,
        "--replace",
      ],
      30 * 60_000
    )
    if ((await sizeOf(target)) <= MAX_FILE_BYTES) return name
  }
  // Too long to fit even at 720p: the gallery shows the still and links to the source.
  await fsp.rm(target, { force: true })
  return null
}

// ---------- Sending it to Cloudflare ----------

// Static files plus the small editor-mode script (gallery-worker/), with a
// free KV store for edits. The script only runs for /api/*; every other
// request is a plain file. Run from the cache folder so the tool doesn't try
// to configure this project.
async function deploy() {
  await writeWorkerConfig()
  const output = await wrangler(
    ["deploy", "--config", WORKER_CONFIG],
    60 * 60_000
  )
  const url = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/)?.[0]
  if (!url) throw new Error("Published, but Cloudflare didn't say where.")
  return url
}

// Paths are relative to the cache folder, so the same files work from the
// GitHub copy that Cloudflare builds from.
async function writeWorkerConfig() {
  const kvId = state.kvId ?? (await createEditStore())
  await fsp.copyFile(WORKER_SCRIPT, WORKER_COPY)
  await fsp.writeFile(
    WORKER_CONFIG,
    JSON.stringify(
      {
        name: PROJECT,
        main: path.basename(WORKER_COPY),
        compatibility_date: "2026-10-01",
        assets: {
          directory: path.basename(SITE_DIR),
          binding: "ASSETS",
          run_worker_first: ["/api/*"],
        },
        kv_namespaces: [{ binding: "EDITS", id: kvId }],
      },
      null,
      2
    )
  )
}

// ---------- Publishing through GitHub ----------

async function publishViaGitHub(repo: string) {
  const url = state.url
  if (!url)
    throw new Error("Publish once with Cloudflare before switching to GitHub.")
  await writeWorkerConfig()
  await pushGallery(CACHE_DIR, GALLERY_GIT_DIR, galleryRemote(repo))
  if (!(await waitUntilLive(url)))
    throw new Error("Sent to GitHub, but Cloudflare hasn't put it live yet.")
  return url
}

export function galleryRemote(repo: string) {
  return /^[\w.-]+\/[\w.-]+$/.test(repo)
    ? `https://github.com/${repo}.git`
    : repo
}

/**
 * Uploads the gallery (site/, the worker and its config) as one fresh version
 * that replaces the last, so the GitHub copy never grows with history. Only
 * changed files are sent, because GitHub already has the rest.
 */
export async function pushGallery(
  workTree: string,
  gitDir: string,
  remote: string
) {
  const signIn = await githubSignIn(remote)
  const git = (args: string[], timeoutMs = 5 * 60_000) =>
    run(
      "/usr/bin/git",
      [
        "--git-dir",
        gitDir,
        "--work-tree",
        workTree,
        "-c",
        "user.name=Inspo",
        "-c",
        "user.email=inspo@localhost",
        ...signIn,
        ...args,
      ],
      timeoutMs,
      workTree
    )
  if (!(await exists(gitDir))) await git(["init", "--quiet"])
  await git(["add", "--all", "--", "site", "worker.js", "wrangler.json"])
  const tree = (await git(["write-tree"])).trim()
  const commit = (
    await git(["commit-tree", tree, "-m", "Gallery update"])
  ).trim()
  await git(
    ["push", "--force", "--quiet", remote, `${commit}:refs/heads/main`],
    60 * 60_000
  )
  // Remembered here, so the next upload knows what GitHub already has.
  await git(["update-ref", "refs/heads/main", commit])
}

// The app runs without Homebrew on its PATH, so point git at GitHub's own
// sign-in tool directly; it uses the Mac's lasting GitHub login.
async function githubSignIn(remote: string) {
  if (!remote.startsWith("https://github.com/")) return []
  for (const gh of ["/opt/homebrew/bin/gh", "/usr/local/bin/gh"]) {
    if (await exists(gh))
      return [
        "-c",
        "credential.helper=",
        "-c",
        `credential.helper=!${gh} auth git-credential`,
      ]
  }
  return []
}

// Cloudflare builds from GitHub on its own, so watch the live gallery until it
// serves the same files as here.
async function waitUntilLive(url: string) {
  const deadline = Date.now() + LIVE_WAIT_MS
  const wanted = await Promise.all(
    LIVE_FILES.map((name) => fsp.readFile(path.join(SITE_DIR, name), "utf8"))
  )
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, LIVE_CHECK_MS))
    try {
      const live = await Promise.all(
        LIVE_FILES.map(async (name) => {
          const res = await fetch(`${url}/${name}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(20_000),
          })
          return res.ok ? res.text() : null
        })
      )
      if (live.every((text, i) => text === wanted[i])) return true
    } catch (error) {
      console.warn(
        `[publish] checking the live gallery: ${errorMessage(error)}`
      )
    }
  }
  return false
}

function wrangler(args: string[], timeoutMs = 120_000) {
  return run(process.execPath, [WRANGLER, ...args], timeoutMs, CACHE_DIR)
}

async function createEditStore() {
  let output: string
  try {
    output = await wrangler(["kv", "namespace", "create", `${PROJECT}-edits`])
  } catch (error) {
    // Already made on an earlier attempt: find it in the list.
    const listing = await wrangler(["kv", "namespace", "list"])
    const found = (JSON.parse(listing) as { id: string; title: string }[]).find(
      (ns) => ns.title.endsWith(`${PROJECT}-edits`)
    )
    if (!found) throw error
    output = found.id
  }
  const id = output.match(/[0-9a-f]{32}/)?.[0]
  if (!id) throw new Error("Couldn't set up storage for gallery edits.")
  await setState({ kvId: id })
  return id
}

// ---------- Editor mode ----------

/** Sets (or, with null, removes) the password for editing in the gallery. */
export async function setEditingPassword(password: string | null) {
  if (!state.url)
    throw new Error("Publish the gallery once before turning on editing.")
  if (password !== null && password.length < 6)
    throw new Error("Use at least 6 characters.")
  // Make sure the editor-mode script is live before the secrets go in.
  await deploy()
  if (password === null) {
    await wrangler([
      "secret",
      "delete",
      "EDIT_PASSWORD_HASH",
      "--name",
      PROJECT,
    ]).catch(() => {})
    await setState({ editing: false })
    return publishState()
  }
  // Only a salted hash leaves this Mac. A new signing key also logs out every
  // device that was unlocked with the old password.
  const salt = crypto.randomBytes(16).toString("hex")
  const digest = crypto
    .createHash("sha256")
    .update(`${salt}:${password}`)
    .digest("hex")
  const sessionKey = crypto.randomBytes(32).toString("hex")
  await putSecret("EDIT_PASSWORD_HASH", `${salt}:${digest}`)
  await putSecret("SESSION_KEY", sessionKey)
  await run("security", [
    "add-generic-password",
    "-U",
    "-s",
    KEYCHAIN_SERVICE,
    "-a",
    "session-key",
    "-w",
    sessionKey,
  ])
  await setState({ editing: true })
  return publishState()
}

// The secret goes in through stdin, so it never appears in a command line or log.
function putSecret(name: string, value: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [WRANGLER, "secret", "put", name, "--name", PROJECT],
      {
        cwd: CACHE_DIR,
        stdio: ["pipe", "ignore", "pipe"],
      }
    )
    let stderr = ""
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", reject)
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Couldn't save ${name}: ${stderr.slice(-200)}`))
    )
    child.stdin.end(value)
  })
}

async function macToken() {
  const key = (
    await run("security", [
      "find-generic-password",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      "session-key",
      "-w",
    ])
  ).trim()
  const expires = Date.now() + 5 * 60_000
  const signature = crypto
    .createHmac("sha256", key)
    .update(`edit:${expires}`)
    .digest("hex")
  return `${expires}.${signature}`
}

type GalleryEdit = { id: string; itemId: string; op: string; value?: string }

async function galleryApi(pathname: string, body: object) {
  const res = await fetch(`${state.url}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await macToken()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`The gallery answered ${res.status}`)
  return res.json()
}

let pulling = false

/** Collects edits made in the gallery and writes them into the library. */
export async function pullGalleryEdits() {
  if (!state.editing || !state.url || pulling) return
  pulling = true
  try {
    const { edits } = (await galleryApi("/api/edits/pull", {})) as {
      edits: GalleryEdit[]
    }
    const applied = new Set(state.appliedEditIds ?? [])
    const fresh = edits.filter((edit) => !applied.has(edit.id))
    if (!fresh.length) return

    const { items } = await listItems()
    const byPublicId = new Map(items.map((item) => [publicId(item), item]))
    for (const edit of fresh) {
      // Tag changes for a component ("component:<slug>") carry the full tag list.
      if (
        edit.op === "setComponentTags" &&
        edit.itemId.startsWith("component:")
      ) {
        await setComponentTags(
          edit.itemId.slice("component:".length),
          (edit.value ?? "").split(",")
        ).catch((error) =>
          console.warn(`[edits] ${edit.itemId}: ${errorMessage(error)}`)
        )
        applied.add(edit.id)
        continue
      }
      const item = byPublicId.get(edit.itemId)
      if (item) {
        try {
          await applyEdit(item, edit)
        } catch (error) {
          console.warn(
            `[edits] ${edit.op} on ${item.id}: ${errorMessage(error)}`
          )
        }
      }
      applied.add(edit.id) // Applied, or about something that's gone: either way, done.
    }
    // Kept in the gallery until a publish includes them, so nothing flickers back.
    await setState({ appliedEditIds: [...applied] })
    schedulePublish()
  } catch (error) {
    console.warn(`[edits] ${errorMessage(error)}`)
  } finally {
    pulling = false
  }
}

async function applyEdit(item: Item, edit: GalleryEdit) {
  const value = edit.value?.trim().toLowerCase()
  switch (edit.op) {
    case "addTag":
      if (value && !item.tags.includes(value))
        await updateItem(item.id, { tags: [...item.tags, value] })
      return
    case "removeTag":
      await updateItem(item.id, {
        tags: item.tags.filter((tag) => tag !== value),
      })
      return
    case "removeAutoTag":
      await updateItem(item.id, {
        autoTags: item.autoTags.filter((tag) => tag !== value),
      })
      return
    case "setTitle":
      await updateItem(item.id, { title: edit.value ?? "" })
      return
    case "delete":
      await deleteItem(item.id)
      return
  }
}

async function clearAppliedEdits() {
  const ids = state.appliedEditIds ?? []
  if (!ids.length || !state.editing) return
  try {
    await galleryApi("/api/edits/ack", { ids })
    await setState({ appliedEditIds: [] })
  } catch (error) {
    console.warn(`[edits] ${errorMessage(error)}`)
  }
}

export function startGallerySync() {
  setInterval(() => void pullGalleryEdits(), PULL_EVERY_MS)
  void pullGalleryEdits()
}
