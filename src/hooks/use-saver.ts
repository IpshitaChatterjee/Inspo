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

/** Saving files and links, with progress toasts. New saves get `tag`. */
export function useSaver(tag: string | null) {
  const where = tag ? ` with #${tag}` : ""

  const saveFiles = React.useCallback(
    async (files: File[]) => {
      const media = files.filter(isMedia)
      if (!media.length) {
        toast.error("Only images and videos can be saved.")
        return
      }
      const label = media.length === 1 ? media[0].name : `${media.length} files`
      const job = (async () => {
        for (const file of media) await api.upload(file, tag)
      })()
      toast.promise(job, {
        loading: `Saving ${label}…`,
        success: `Saved ${label}${where}`,
        error: (e: Error) => e.message,
      })
      await job.catch(() => {})
    },
    [tag, where]
  )

  const saveLink = React.useCallback(
    async (url: string) => {
      const job = api.capture(url.trim(), tag)
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
    [tag, where]
  )

  return { saveFiles, saveLink }
}
