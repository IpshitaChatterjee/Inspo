import * as React from "react"
import { motion } from "motion/react"

import { ComponentBoundary } from "@/components/component-boundary"
import type { LibraryEntry } from "@/library"
import { defaultValues } from "@/library/types"

type LoadedComponent = Awaited<ReturnType<LibraryEntry["load"]>>["default"]

type ComponentCardProps = {
  entry: LibraryEntry
  delay?: number
  onOpen: (entry: LibraryEntry) => void
}

// How much wider the live preview is laid out than the card, so the sample
// headline sits in the card the way it does in the full view.
const PREVIEW_SCALE = 2.5

export function ComponentCard({
  entry,
  delay = 0,
  onOpen,
}: ComponentCardProps) {
  const { meta } = entry
  const ref = React.useRef<HTMLButtonElement>(null)
  const [onScreen, setOnScreen] = React.useState(false)
  const [Loaded, setLoaded] = React.useState<LoadedComponent | null>(null)
  const requested = React.useRef(false)

  // Only components near the screen are mounted; the rest stay a plain block.
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([e]) => setOnScreen(e.isIntersecting),
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The component's code downloads the first time its card comes near.
  React.useEffect(() => {
    if (!onScreen || requested.current) return
    requested.current = true
    entry
      .load()
      .then((mod) => setLoaded(() => mod.default))
      .catch(() => {
        // Tries again the next time the card comes on screen.
        requested.current = false
      })
  }, [onScreen, entry])

  const values = React.useMemo(() => defaultValues(meta.controls), [meta])

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
    >
      <button
        ref={ref}
        type="button"
        onClick={() => onOpen(entry)}
        aria-label={meta.title}
        className="group/card relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted text-left ring-1 ring-foreground/5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none hover:scale-[1.02] focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        {onScreen && Loaded && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 origin-top-left"
            style={{
              width: `${PREVIEW_SCALE * 100}%`,
              height: `${PREVIEW_SCALE * 100}%`,
              transform: `scale(${1 / PREVIEW_SCALE})`,
            }}
          >
            <ComponentBoundary fallback={null}>
              {React.createElement(Loaded, values, meta.demo)}
            </ComponentBoundary>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-1 flex-col gap-1.5 bg-linear-to-t from-black/60 to-transparent p-3 pt-10 text-white opacity-0 transition-all duration-300 ease-out group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-visible/card:translate-y-0 group-focus-visible/card:opacity-100">
          <span className="font-heading text-sm leading-tight font-medium">
            {meta.title}
          </span>
          {meta.tags.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {meta.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/12 px-2 py-0.5 text-[11px] backdrop-blur-md"
                >
                  #{tag}
                </span>
              ))}
            </span>
          )}
        </div>
      </button>
    </motion.div>
  )
}
