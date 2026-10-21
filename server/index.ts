import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { pipeline } from "node:stream/promises"

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"

import { INSPO_DIR, IS_PROD, PORT, TMP_DIR } from "./config.ts"
import {
  addLink,
  changeProjectItems,
  createProject,
  deleteProject,
  restoreProject,
  updateProject,
  addUpload,
  deleteItem,
  ensureFolders,
  events,
  getFile,
  listItems,
  renameTag,
  setComponentTags,
  restoreItem,
  reveal,
  scan,
  updateItem,
  watch,
} from "./library.ts"
import { mediaFile, type Size } from "./media.ts"
import {
  loadPublishState,
  publishEvents,
  publishNow,
  publishState,
  schedulePublish,
  setEditingPassword,
  startGallerySync,
} from "./publish.ts"
import { errorMessage, hash } from "./util.ts"

const app = express()
app.use(express.json({ limit: "1mb" }))

type Handler = (req: Request, res: Response) => Promise<unknown>
const route =
  (handler: Handler) => (req: Request, res: Response, next: NextFunction) =>
    handler(req, res).catch(next)

const param = (value: unknown) => (typeof value === "string" ? value : "")

app.get(
  "/api/items",
  route(async (_req, res) => {
    res.json(await listItems())
  })
)

app.patch(
  "/api/items",
  route(async (req, res) => {
    const { id, tags, autoTags, note, title } = req.body ?? {}
    await updateItem(param(id), { tags, autoTags, note, title })
    res.json({ ok: true })
  })
)

app.delete(
  "/api/items",
  route(async (req, res) => {
    res.json({ undoId: await deleteItem(param(req.query.id)) })
  })
)

app.post(
  "/api/restore",
  route(async (req, res) => {
    res.json({ id: await restoreItem(param(req.body?.undoId)) })
  })
)

app.post(
  "/api/projects",
  route(async (req, res) => {
    const { name, items } = req.body ?? {}
    res.json(await createProject(name, items))
  })
)

app.patch(
  "/api/projects",
  route(async (req, res) => {
    const { id, name, archived, board } = req.body ?? {}
    res.json(await updateProject(param(id), { name, archived, board }))
  })
)

app.post(
  "/api/projects/items",
  route(async (req, res) => {
    const { id, add, remove } = req.body ?? {}
    res.json(await changeProjectItems(param(id), add, remove))
  })
)

app.delete(
  "/api/projects",
  route(async (req, res) => {
    res.json(await deleteProject(param(req.query.id)))
  })
)

app.post(
  "/api/projects/restore",
  route(async (req, res) => {
    await restoreProject(req.body?.project)
    res.json({ ok: true })
  })
)

app.patch(
  "/api/components",
  route(async (req, res) => {
    const { slug, tags } = req.body ?? {}
    await setComponentTags(param(slug), tags)
    res.json({ ok: true })
  })
)

app.patch(
  "/api/tags",
  route(async (req, res) => {
    const { from, to } = req.body ?? {}
    await renameTag(param(from), typeof to === "string" ? to : null)
    res.json({ ok: true })
  })
)

app.post(
  "/api/capture",
  route(async (req, res) => {
    const { url, tags } = req.body ?? {}
    if (!param(url)) throw new Error("Paste a link to save.")
    res.json(await addLink(param(url), { tags }))
  })
)

// The file is streamed in as the raw request body.
app.post(
  "/api/upload",
  route(async (req, res) => {
    const name = path.basename(param(req.query.name)) || "upload"
    const tags = param(req.query.tag) ? [param(req.query.tag)] : []
    await fsp.mkdir(TMP_DIR, { recursive: true })
    const temp = path.join(
      TMP_DIR,
      `${hash(name + Date.now() + Math.random())}.part`
    )
    await pipeline(req, fs.createWriteStream(temp))
    res.json({ id: await addUpload(temp, name, { tags }) })
  })
)

app.post(
  "/api/reveal",
  route(async (req, res) => {
    await reveal(param(req.body?.id))
    res.json({ ok: true })
  })
)

app.get(
  "/api/media",
  route(async (req, res) => {
    const file = getFile(param(req.query.id))
    if (!file) return res.status(404).end()
    const size = (
      ["thumb", "large", "orig"].includes(param(req.query.size))
        ? req.query.size
        : "orig"
    ) as Size
    const out = await mediaFile(file, size)
    if (!out) return res.status(404).end()
    // Each URL carries the file's version, so it's safe to cache for a long time.
    res.sendFile(out, { maxAge: "30d", immutable: true, dotfiles: "allow" })
  })
)

app.get("/api/publish", (_req, res) => {
  res.json(publishState())
})

app.post(
  "/api/publish",
  route(async (_req, res) => {
    // Answer straight away; progress arrives over /api/events.
    void publishNow()
    res.json({ ...publishState(), status: "publishing" })
  })
)

app.post(
  "/api/publish/password",
  route(async (req, res) => {
    const { password } = req.body ?? {}
    res.json(
      await setEditingPassword(typeof password === "string" ? password : null)
    )
  })
)

// Live updates: the page refreshes when the folder changes.
app.get("/api/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  res.flushHeaders()
  const send = (payload: object) =>
    res.write(`data: ${JSON.stringify(payload)}\n\n`)
  const onChanged = () => send({ type: "changed" })
  const onToast = (toast: { message: string }) =>
    send({ type: "toast", ...toast })
  const onPublish = (publish: object) => send({ type: "publish", publish })
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000)
  events.on("changed", onChanged)
  events.on("toast", onToast)
  publishEvents.on("change", onPublish)
  req.on("close", () => {
    publishEvents.off("change", onPublish)
    clearInterval(heartbeat)
    events.off("changed", onChanged)
    events.off("toast", onToast)
  })
})

if (IS_PROD) {
  const dist = path.resolve(import.meta.dirname, "../dist")
  app.use(express.static(dist))
  app.get("/{*any}", (_req, res) => res.sendFile(path.join(dist, "index.html")))
}

// Express spots error handlers by their four arguments, so _next has to stay.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.warn(`[api] ${errorMessage(error)}`)
  res.status(400).json({ error: errorMessage(error) })
})

await ensureFolders()
await loadPublishState()
// Component changes arrive as code changes and an app restart; check on start.
// An unchanged gallery is skipped by the publish fingerprint.
schedulePublish()
await scan()
watch()
// Keep the published gallery in step with the library.
events.on("changed", schedulePublish)
// Bring in edits made in the gallery's editor mode.
startGallerySync()

// Only this Mac can open the app; nothing is exposed to the network.
app.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Inspo is running → http://localhost:${PORT}`)
  console.log(`  Reading from ${INSPO_DIR}\n`)
})
