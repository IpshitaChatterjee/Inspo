import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { DownloadIcon } from "lucide-react"

import { looksLikeUrl } from "@/hooks/use-saver"

type DropOverlayProps = {
  tag: string | null
  onFiles: (files: File[]) => void
  onLink: (url: string) => void
}

const carriesSomething = (e: DragEvent) =>
  !!e.dataTransfer && [...e.dataTransfer.types].some((t) => t === "Files" || t === "text/uri-list")

/** Drag files or links from anywhere (Finder, a browser tab) onto the window. */
export function DropOverlay({ tag, onFiles, onLink }: DropOverlayProps) {
  const [active, setActive] = React.useState(false)
  const depth = React.useRef(0)

  React.useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!carriesSomething(e)) return
      e.preventDefault()
      depth.current++
      setActive(true)
    }
    const onOver = (e: DragEvent) => {
      if (carriesSomething(e)) e.preventDefault()
    }
    const onLeave = () => {
      depth.current = Math.max(0, depth.current - 1)
      if (!depth.current) setActive(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!carriesSomething(e)) return
      e.preventDefault()
      depth.current = 0
      setActive(false)
      const files = [...(e.dataTransfer?.files ?? [])]
      if (files.length) return onFiles(files)
      const text = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain") || ""
      const url = text.split("\n").find((line) => looksLikeUrl(line))
      if (url) onLink(url.trim())
    }
    window.addEventListener("dragenter", onEnter)
    window.addEventListener("dragover", onOver)
    window.addEventListener("dragleave", onLeave)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("dragenter", onEnter)
      window.removeEventListener("dragover", onOver)
      window.removeEventListener("dragleave", onLeave)
      window.removeEventListener("drop", onDrop)
    }
  }, [onFiles, onLink])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="drop-ring flex size-full flex-col items-center justify-center gap-4 rounded-3xl"
          >
            <motion.span
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
            >
              <DownloadIcon className="size-6" />
            </motion.span>
            <span className="font-heading text-2xl font-medium">Drop to save</span>
            <span className="text-sm text-muted-foreground">
              {tag ? `Saved with #${tag}` : "Goes into your iCloud Inspo folder"}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
