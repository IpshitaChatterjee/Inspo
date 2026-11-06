import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Projects were removed from the app, but the library file may still hold them.
const legacyProjects = {
  p1: {
    id: "p1",
    name: "Rebrand",
    createdAt: "2026-10-30T10:00:00.000Z",
    items: ["link:one"],
    board: { layout: "a", order: ["link:one"] },
  },
}

let dir: string

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), "inspo-library-"))
  vi.stubEnv("INSPO_DIR", dir)
  vi.resetModules()
})

afterEach(async () => {
  vi.unstubAllEnvs()
  await fsp.rm(dir, { recursive: true, force: true })
})

async function writeLibraryFile(content: object) {
  await fsp.writeFile(
    path.join(dir, "_library.json"),
    JSON.stringify(content, null, 2)
  )
}

async function readLibraryFile() {
  return JSON.parse(
    await fsp.readFile(path.join(dir, "_library.json"), "utf8")
  ) as Record<string, unknown>
}

describe("writing the library file", () => {
  it("keeps a field the app no longer uses, unchanged", async () => {
    await writeLibraryFile({
      version: 2,
      items: { "link:one": { title: "One", source: "https://example.com" } },
      projects: legacyProjects,
    })
    const library = await import("./library.ts")
    await library.scan()

    await library.updateItem("link:one", { tags: ["Poster"] })

    const written = await readLibraryFile()
    expect(written.projects).toEqual(legacyProjects)
    expect(written.items).toEqual({
      "link:one": {
        title: "One",
        source: "https://example.com",
        tags: ["poster"],
      },
    })
  })
})
