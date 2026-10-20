import * as React from "react"

import type { Item, Patch } from "@/lib/api"

// Editor mode in the shared gallery. Edits are sent to the gallery's small
// server (gallery-worker/), shown to every visitor straight away, and picked
// up by the Mac, which writes them into the iCloud library.

export type EditOp =
  "addTag" | "removeTag" | "removeAutoTag" | "setTitle" | "delete"
export type GalleryEdit = {
  id?: string
  itemId: string
  op: EditOp
  value?: string
}

const TOKEN_KEY = "inspo-edit-token"

export function savedToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    return token && Number(token.split(".")[0]) > Date.now() ? token : null
  } catch {
    return null
  }
}

function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Private browsing: editing just won't be remembered.
  }
}

export async function unlock(password: string) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? "Couldn't unlock editing.")
  saveToken(body.token)
  return body.token as string
}

export function lock() {
  saveToken(null)
}

export async function pendingEdits(): Promise<GalleryEdit[]> {
  const res = await fetch("/api/edits", { cache: "no-store" })
  if (!res.ok) return []
  return (await res.json()).edits ?? []
}

export class LockedError extends Error {}

export async function sendEdit(token: string, edit: GalleryEdit) {
  const res = await fetch("/api/edits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(edit),
  })
  if (res.status === 401)
    throw new LockedError("Editing is locked. Unlock it with your password.")
  if (!res.ok)
    throw new Error(
      (await res.json().catch(() => ({}))).error ?? "Couldn't save that edit."
    )
}

/** The library as it will be once the Mac has applied the pending edits. */
export function withEdits(items: Item[], edits: GalleryEdit[]) {
  const byId = new Map(items.map((item) => [item.id, { ...item }]))
  for (const edit of edits) {
    const item = byId.get(edit.itemId)
    if (!item) continue
    const value = edit.value?.trim().toLowerCase() ?? ""
    if (edit.op === "addTag" && value && !item.tags.includes(value))
      item.tags = [...item.tags, value]
    if (edit.op === "removeTag")
      item.tags = item.tags.filter((tag) => tag !== value)
    if (edit.op === "removeAutoTag")
      item.autoTags = item.autoTags.filter((tag) => tag !== value)
    if (edit.op === "setTitle") item.title = edit.value?.trim() || null
    if (edit.op === "delete") byId.delete(item.id)
  }
  return items
    .filter((item) => byId.has(item.id))
    .map((item) => byId.get(item.id)!)
}

/** Turns a change made in the panel into the edits that describe it. */
export function editsFor(item: Item, patch: Patch): GalleryEdit[] {
  const edits: GalleryEdit[] = []
  if (patch.tags) {
    for (const tag of patch.tags)
      if (!item.tags.includes(tag))
        edits.push({ itemId: item.id, op: "addTag", value: tag })
    for (const tag of item.tags)
      if (!patch.tags.includes(tag))
        edits.push({ itemId: item.id, op: "removeTag", value: tag })
  }
  if (patch.autoTags) {
    for (const tag of item.autoTags) {
      if (!patch.autoTags.includes(tag))
        edits.push({ itemId: item.id, op: "removeAutoTag", value: tag })
    }
  }
  if (patch.title !== undefined)
    edits.push({ itemId: item.id, op: "setTitle", value: patch.title ?? "" })
  return edits
}

/** Whether the person looking can change things (always on the Mac; when unlocked in the gallery). */
export const CanEditContext = React.createContext(false)
export const useCanEdit = () => React.useContext(CanEditContext)
