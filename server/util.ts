import { execFile } from "node:child_process"
import crypto from "node:crypto"
import fsp from "node:fs/promises"
import path from "node:path"

export function run(cmd: string, args: string[], timeoutMs = 60_000) {
  return new Promise<string>((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
  })
}

// Runs at most `n` jobs at once; the rest wait in line.
export function limiter(n: number) {
  let active = 0
  const queue: (() => void)[] = []
  const next = () => {
    if (active >= n) return
    const start = queue.shift()
    if (start) start()
  }
  return <T>(job: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        active++
        job()
          .then(resolve, reject)
          .finally(() => {
            active--
            next()
          })
      })
      next()
    })
}

export function hash(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 16)
}

export function slugify(value: string, max = 48) {
  const slug = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "")
  return slug || "inspo"
}

export function stamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

export async function exists(file: string) {
  try {
    await fsp.access(file)
    return true
  } catch {
    return false
  }
}

// Picks "name.ext", then "name-2.ext", "name-3.ext"... whichever is free.
export async function uniquePath(dir: string, base: string, ext: string) {
  let candidate = path.join(dir, `${base}.${ext}`)
  for (let i = 2; await exists(candidate); i++) {
    candidate = path.join(dir, `${base}-${i}.${ext}`)
  }
  return candidate
}

// rename() fails across volumes, so fall back to copy + delete.
export async function moveFile(from: string, to: string) {
  try {
    await fsp.rename(from, to)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error
    await fsp.copyFile(from, to)
    await fsp.unlink(from)
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

// Files synced from another device can arrive as iCloud placeholders with no
// content yet. macOS may refuse to fetch them on read (errno -11, EDEADLK),
// so ask iCloud to download them and wait until they're readable.
function isPlaceholderError(error: unknown) {
  const e = error as NodeJS.ErrnoException
  return e?.errno === -11 || e?.code === "EDEADLK"
}

async function canRead(file: string) {
  const handle = await fsp.open(file, "r")
  try {
    await handle.read(Buffer.alloc(1), 0, 1, 0)
  } finally {
    await handle.close()
  }
}

export async function ensureDownloaded(file: string, timeoutMs = 60_000) {
  try {
    return await canRead(file)
  } catch (error) {
    if (!isPlaceholderError(error)) throw error
  }
  await run("brctl", ["download", file]).catch(() => {})
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    try {
      return await canRead(file)
    } catch (error) {
      if (!isPlaceholderError(error)) throw error
    }
  }
  throw new Error("iCloud hasn't finished downloading this file yet.")
}
