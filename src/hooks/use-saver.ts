import * as React from "react"
import { toast } from "sonner"

import { api } from "@/lib/api"

const isMedia = (file: File) =>
  file.type.startsWith("image/") ||
  file.type.startsWith("video/") ||
  /\.(heic|heif|mov|m4v|webm)$/i.test(file.name)

export function looksLikeUrl(text: string) {
  return /^https?:\/\/\S+$/i.test(text.trim())
}

/** Where new saves go besides the library: the tag or project being looked at. */
export type SaveTarget = {
  tag: string | null
  project: { id: string; name: string } | null
}

/** How a save's destination reads, e.g. "with #type" or "and added to “Rebrand”". */
export function whereOf({ tag, project }: SaveTarget) {
  if (project) return `and added to “${project.name}”`
  return tag ? `with #${tag}` : ""
}

/**
 * Saving files and links, with progress toasts. New saves get the tag being
 * looked at, and `onSaved` hears their ids (to add them to the open project).
 */
export function useSaver(
  target: SaveTarget,
  onSaved?: (ids: string[]) => void
) {
  const { tag } = target
  const where = whereOf(target) && ` ${whereOf(target)}`

  const saveFiles = React.useCallback(
    async (files: File[]) => {
      const media = files.filter(isMedia)
      if (!media.length) {
        toast.error("Only images and videos can be saved.")
        return
      }
      const label = media.length === 1 ? media[0].name : `${media.length} files`
      const job = (async () => {
        const ids: string[] = []
        for (const file of media) ids.push((await api.upload(file, tag)).id)
        onSaved?.(ids)
      })()
      toast.promise(job, {
        loading: `Saving ${label}…`,
        success: `Saved ${label}${where}`,
        error: (e: Error) => e.message,
      })
      await job.catch(() => {})
    },
    [tag, where, onSaved]
  )

  const saveLink = React.useCallback(
    async (url: string) => {
      const job = api.capture(url.trim(), tag).then((r) => {
        onSaved?.(r.ids)
        return r
      })
      toast.promise(job, {
        loading: "Grabbing images from the link…",
        success: (r) =>
          r.savedMedia
            ? `Saved “${r.title}”${where}`
            : `Saved “${r.title}” as a link — no image or video found`,
        error: (e: Error) => e.message,
      })
      await job.catch(() => {})
    },
    [tag, where, onSaved]
  )

  return { saveFiles, saveLink }
}
