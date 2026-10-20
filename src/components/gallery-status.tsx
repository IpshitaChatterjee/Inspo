import * as React from "react"
import {
  ArrowUpRightIcon,
  GlobeIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { GALLERY_WARN_AT, galleryFullness, type PublishState } from "@/lib/api"

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })
}

/** The shareable gallery: its link, when it was last updated, and a way to update it now. */
export function GalleryStatus({
  state,
  onPublish,
}: {
  state: PublishState | null
  onPublish: () => void
}) {
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

  const fullness = galleryFullness(state)
  const nearlyFull = fullness >= GALLERY_WARN_AT

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg p-2.5",
        nearlyFull
          ? "bg-amber-500/15 ring-1 ring-amber-500/30"
          : "bg-sidebar-accent/60"
      )}
    >
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
      {nearlyFull && (
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="h-1 overflow-hidden rounded-full bg-amber-500/20">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${Math.min(100, Math.round(fullness * 100))}%` }}
            />
          </div>
          <span className="flex items-start gap-1 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
            <TriangleAlertIcon className="mt-px size-3 shrink-0" />
            {Math.round(fullness * 100)}% full ({state!.files!.toLocaleString()}{" "}
            of {state!.fileLimit!.toLocaleString()} free files). Time to plan
            for more room.
          </span>
        </div>
      )}
    </div>
  )
}
