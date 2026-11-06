import { execFileSync } from "node:child_process"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { friendlyError, galleryRemote, pushGallery } from "./publish.ts"

function failedCommand(output: string) {
  return Object.assign(
    new Error(
      "Command failed: /Users/me/.local/share/mise/installs/node/24.21.0/bin/node /Users/me/Inspo/node_modules/wrangler/bin/wrangler.js deploy --config /Users/me/Library/Caches/inspo/wrangler.json"
    ),
    { output }
  )
}

describe("friendlyError", () => {
  it("says Cloudflare is signed out when wrangler asks for an API token", () => {
    const error = failedCommand(
      "✘ [ERROR] In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable for wrangler to work."
    )
    expect(friendlyError(error)).toBe("Signed out of Cloudflare.")
  })

  it("says Cloudflare is signed out when wrangler says so", () => {
    expect(friendlyError(failedCommand("You are not logged in."))).toBe(
      "Signed out of Cloudflare."
    )
  })

  it("never shows a command line for an error it doesn't recognise", () => {
    expect(friendlyError(failedCommand("Something else broke"))).toBe(
      "Couldn't publish. Try again in a bit."
    )
  })

  it("keeps a plain message the app wrote itself", () => {
    expect(friendlyError(new Error("The gallery answered 500"))).toBe(
      "The gallery answered 500"
    )
  })

  it("says GitHub is signed out when git can't sign in", () => {
    expect(
      friendlyError(
        failedCommand(
          "fatal: could not read Username for 'https://github.com': Device not configured\nTo get started with GitHub CLI, please run:  gh auth login"
        )
      )
    ).toBe("Signed out of GitHub.")
  })

  it("says the Mac is offline when GitHub can't be reached", () => {
    expect(
      friendlyError(
        failedCommand(
          "fatal: unable to access 'https://github.com/me/inspo-gallery.git/': Could not resolve host: github.com"
        )
      )
    ).toBe("Offline. Will try again with the next change.")
  })
})

describe("galleryRemote", () => {
  it("turns owner/name into a GitHub address", () => {
    expect(galleryRemote("me/inspo-gallery")).toBe(
      "https://github.com/me/inspo-gallery.git"
    )
  })

  it("keeps a full address or folder as it is", () => {
    expect(galleryRemote("/tmp/remote.git")).toBe("/tmp/remote.git")
    expect(galleryRemote("https://example.com/x.git")).toBe(
      "https://example.com/x.git"
    )
  })
})

describe("pushGallery", () => {
  let root: string
  let workTree: string
  let gitDir: string
  let remote: string

  const git = (...args: string[]) =>
    execFileSync("git", ["--git-dir", remote, ...args], { encoding: "utf8" })

  beforeEach(async () => {
    root = await fsp.mkdtemp(path.join(os.tmpdir(), "inspo-gallery-"))
    workTree = path.join(root, "cache")
    gitDir = path.join(root, "cache", "gallery.git")
    remote = path.join(root, "remote.git")
    execFileSync("git", ["init", "--bare", "--quiet", remote])
    await fsp.mkdir(path.join(workTree, "site", "m"), { recursive: true })
    await fsp.mkdir(path.join(workTree, "thumbs"), { recursive: true })
    await fsp.writeFile(path.join(workTree, "site", "data.json"), "v1")
    await fsp.writeFile(path.join(workTree, "site", "m", "a.jpg"), "a")
    await fsp.writeFile(path.join(workTree, "worker.js"), "worker")
    await fsp.writeFile(path.join(workTree, "wrangler.json"), "{}")
    await fsp.writeFile(path.join(workTree, "thumbs", "t.jpg"), "private")
    await fsp.writeFile(path.join(workTree, "publish.json"), "private")
  })

  afterEach(async () => {
    await fsp.rm(root, { recursive: true, force: true })
  })

  it("uploads only the gallery files, as a single version", async () => {
    await pushGallery(workTree, gitDir, remote)

    expect(
      git("ls-tree", "-r", "--name-only", "main").trim().split("\n")
    ).toEqual(["site/data.json", "site/m/a.jpg", "worker.js", "wrangler.json"])
    expect(git("rev-list", "--count", "main").trim()).toBe("1")
  })

  it("replaces the previous version instead of adding to it", async () => {
    await pushGallery(workTree, gitDir, remote)
    await fsp.writeFile(path.join(workTree, "site", "data.json"), "v2")
    await fsp.rm(path.join(workTree, "site", "m", "a.jpg"))
    await fsp.writeFile(path.join(workTree, "site", "m", "b.jpg"), "b")

    await pushGallery(workTree, gitDir, remote)

    expect(git("show", "main:site/data.json")).toBe("v2")
    expect(
      git("ls-tree", "-r", "--name-only", "main").trim().split("\n")
    ).toEqual(["site/data.json", "site/m/b.jpg", "worker.js", "wrangler.json"])
    expect(git("rev-list", "--count", "main").trim()).toBe("1")
  })
})
