import * as React from "react"
import { motion } from "motion/react"
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"

const spring = { type: "spring", stiffness: 260, damping: 30 } as const

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest("input, textarea, [contenteditable='true']")
  )
}

// Arrow keys belong to an open dropdown, not to the item behind it.
function inMenu(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      '[role="listbox"], [role="option"], [role="menu"], [role="menuitem"]'
    )
  )
}

type DetailShellProps = {
  label: string
  onClose: () => void
  onStep: (direction: -1 | 1) => void
  /** The left side, already sized by the caller. */
  media: React.ReactNode
  /** The right side. */
  panel: React.ReactNode
}

// The frame of an opened item: backdrop, keys, layout and the panel's slide-in.
export function DetailShell({
  label,
  onClose,
  onStep,
  media,
  panel,
}: DetailShellProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isTyping(e.target)) (e.target as HTMLElement).blur()
        else onClose()
      }
      if (isTyping(e.target) || inMenu(e.target) || e.defaultPrevented) return
      if (e.key === "ArrowLeft") onStep(-1)
      if (e.key === "ArrowRight") onStep(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, onStep])

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={label}
      className="fixed inset-0 z-50"
    >
      <motion.div
        className="absolute inset-0 bg-background/85 backdrop-blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />

      {/* Phones: image on top, details underneath, all scrolling together.
          Wider screens: image beside a fixed details panel. */}
      <div className="relative flex h-full flex-col overflow-y-auto md:pointer-events-none md:flex-row md:overflow-hidden">
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Close"
          onClick={onClose}
          className="fixed top-3 right-3 z-10 rounded-full shadow-md md:hidden"
        >
          <XIcon />
        </Button>
        <div
          className="flex min-w-0 shrink-0 items-center justify-center px-4 pt-14 pb-4 md:flex-1 md:p-12"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          {media}
        </div>

        <motion.aside
          initial={{ x: 48, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 48, opacity: 0 }}
          transition={{ ...spring, delay: 0.04 }}
          className="pointer-events-auto flex w-full shrink-0 flex-col border-t border-border bg-background/90 backdrop-blur-xl md:h-full md:w-[380px] md:border-t-0 md:border-l"
        >
          {panel}
        </motion.aside>
      </div>
    </div>
  )
}

// The ← → and × row at the top of the panel.
export function DetailNav({
  onStep,
  onClose,
}: {
  onStep: (d: -1 | 1) => void
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous"
          onClick={() => onStep(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next"
          onClick={() => onStep(1)}
        >
          <ChevronRightIcon />
        </Button>
        <span className="ml-1 hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
        </span>
      </div>
      {/* Phones have a floating close button instead. */}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Close"
        onClick={onClose}
        className="hidden md:inline-flex"
      >
        <XIcon />
      </Button>
    </div>
  )
}

export function Field({
  label,
  action,
  children,
}: {
  label: string
  /** A small text button at the right of the label, e.g. Reset. */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}
