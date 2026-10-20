import * as React from "react"
import { ArrowUpRightIcon, GlobeIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { PublishState } from "@/lib/api"

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** The shareable gallery: its link, when it was last updated, and a way to update it now. */
export function GalleryStatus({ state, onPublish }: { state: PublishState | null; onPublish: () => void }) {
  // Re-render every minute so "x min ago" stays true.
  const [, tick] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const publishing = state?.status === "publishing"
  const host = state?.url?.replace(/^https?:\/\//, "")

  let detail: React.ReactNode
  if (publishing) detail = "Publishing…"
  else if (state?.status === "error")
    detail = (
      <span className="flex items-center gap-1 text-destructive">
        <TriangleAlertIcon className="size-3" />
        {state.error ?? "Couldn't publish"}
      </span>
    )
  else if (state?.publishedAt)
    detail = `Updated ${timeAgo(state.publishedAt)}${state.pending ? " · changes waiting" : ""}`
  else detail = "Not published yet"

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-sidebar-accent/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <GlobeIcon className="size-3.5" />
          Shared gallery
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Publish now"
          title="Publish now"
          disabled={publishing}
          onClick={onPublish}
        >
          {publishing ? <Spinner className="size-3" /> : <RefreshCwIcon />}
        </Button>
      </div>
      {state?.url && (
        <a
          href={state.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 truncate text-xs text-foreground underline-offset-2 hover:underline"
        >
          {host}
          <ArrowUpRightIcon className="size-3 shrink-0" />
        </a>
      )}
      <span className="text-[11px] text-muted-foreground">{detail}</span>
    </div>
  )
}
