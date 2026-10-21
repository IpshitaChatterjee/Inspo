import * as React from "react"
import { motion } from "motion/react"
import { CheckIcon, GlobeIcon, PlayIcon } from "lucide-react"
import { cn } from "cn"

import {
  allTagsOf,
  hasPlayableVideo,
  hostOf,
  mediaUrl,
  type Item,
} from "@/lib/api"

type InspoCardProps = {
  item: Item
  ratio: number
  fresh: boolean
  isOpen: boolean
  delay: number
  onOpen: (item: Item) => void
  onRatio: (id: string, ratio: number) => void
  selection?: Selection
}

/** Picking several inspos at once (to add to a project). */
export type Selection = {
  selected: Set<string>
  /** While something is selected, a click selects instead of opening. */
  active: boolean
  toggle: (id: string) => void
}

export function InspoCard({
  item,
  ratio,
  fresh,
  isOpen,
  delay,
  onOpen,
  onRatio,
  selection,
}: InspoCardProps) {
  const selected = selection?.selected.has(item.id) ?? false
  const host = hostOf(item.source)
  const label = item.title ?? host ?? item.name

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{
        type: "spring",
        stiffness: 210,
        damping: 26,
        mass: 0.9,
        delay,
      }}
      className="group/select relative"
    >
      <button
        type="button"
        onClick={() =>
          selection?.active ? selection.toggle(item.id) : onOpen(item)
        }
        aria-label={label}
        aria-pressed={selection?.active ? selected : undefined}
        className={cn(
          "group/card relative block w-full rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
          selected && "ring-3 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <motion.div
          layoutId={`media-${item.id}`}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          style={{ aspectRatio: `1 / ${ratio}`, opacity: isOpen ? 0 : 1 }}
          className={cn(
            "relative overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5",
            fresh && "fresh-glow"
          )}
        >
          {item.kind === "image" && <ImageFace item={item} onRatio={onRatio} />}
          {item.kind === "video" &&
            (hasPlayableVideo(item) ? (
              <VideoFace item={item} onRatio={onRatio} />
            ) : (
              <ImageFace item={item} onRatio={onRatio} />
            ))}
          {item.kind === "link" && <LinkFace item={item} />}

          {item.kind === "video" && (
            <span className="pointer-events-none absolute top-2.5 left-2.5 flex size-6 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md">
              <PlayIcon className="size-3 fill-current" />
            </span>
          )}

          {/* Hover shows only how it's organised; the image speaks for itself. */}
          {item.kind !== "link" &&
            (item.tags.length > 0 || item.autoTags.length > 0) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-1 flex-wrap gap-1 bg-linear-to-t from-black/60 to-transparent p-2.5 pt-8 text-white opacity-0 transition-all duration-300 ease-out group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-visible/card:translate-y-0 group-focus-visible/card:opacity-100">
                {allTagsOf(item)
                  .slice(0, 5)
                  .map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] backdrop-blur-md",
                        item.tags.includes(tag)
                          ? "bg-white/12"
                          : "bg-white/5 text-white/75"
                      )}
                    >
                      #{tag}
                    </span>
                  ))}
              </div>
            )}
        </motion.div>
      </button>
      {selection && (
        <button
          type="button"
          aria-label={selected ? `Unselect ${label}` : `Select ${label}`}
          aria-pressed={selected}
          onClick={() => selection.toggle(item.id)}
          className={cn(
            "absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full border-2 shadow-sm backdrop-blur-md transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/60",
            selected
              ? "border-primary bg-primary text-primary-foreground opacity-100"
              : "border-white/90 bg-black/25 text-transparent",
            !selected &&
              (selection.active
                ? "opacity-100"
                : // Touch screens can't hover, so the tick stays in view there.
                  "opacity-0 group-hover/select:opacity-100 pointer-coarse:opacity-100")
          )}
        >
          <CheckIcon className="size-3.5" strokeWidth={3} />
        </button>
      )}
    </motion.div>
  )
}

const faceClass =
  "absolute inset-0 size-full object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.04]"

function ImageFace({
  item,
  onRatio,
}: {
  item: Item
  onRatio: InspoCardProps["onRatio"]
}) {
  const [loaded, setLoaded] = React.useState(false)
  return (
    <img
      src={mediaUrl(item, "thumb")}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={(e) => {
        const img = e.currentTarget
        if (img.naturalWidth)
          onRatio(item.id, img.naturalHeight / img.naturalWidth)
        setLoaded(true)
      }}
      className={cn(
        faceClass,
        "transition-[opacity,transform]",
        loaded ? "opacity-100" : "opacity-0"
      )}
    />
  )
}

// Videos play silently while on screen and pause when scrolled away.
function VideoFace({
  item,
  onRatio,
}: {
  item: Item
  onRatio: InspoCardProps["onRatio"]
}) {
  const ref = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const video = ref.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.preload = "auto"
          void video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={mediaUrl(item, "orig")}
      poster={mediaUrl(item, "thumb")}
      muted
      loop
      playsInline
      preload="none"
      onLoadedMetadata={(e) => {
        const video = e.currentTarget
        if (video.videoWidth)
          onRatio(item.id, video.videoHeight / video.videoWidth)
      }}
      className={faceClass}
    />
  )
}

function LinkFace({ item }: { item: Item }) {
  const host = hostOf(item.source)
  return (
    <div className="absolute inset-0 flex flex-col justify-between gap-3 bg-card p-4 transition-colors duration-300 group-hover/card:bg-accent">
      <div className="flex flex-col gap-2">
        <span className="line-clamp-3 font-heading text-base leading-snug font-medium text-card-foreground">
          {item.title ?? host}
        </span>
        {item.description && (
          <span className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </span>
        )}
      </div>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <GlobeIcon className="size-3.5" />
        {host}
      </span>
    </div>
  )
}
