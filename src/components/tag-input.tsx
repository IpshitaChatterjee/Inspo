import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { SparklesIcon, XIcon } from "lucide-react"

type TagInputProps = {
  value: string[]
  /** Tags the Mac added; shown lighter, and can be removed but not edited. */
  autoValue?: string[]
  suggestions: string[]
  onChange: (tags: string[]) => void
  onRemoveAuto?: (tag: string) => void
}

export function TagInput({ value, autoValue = [], suggestions, onChange, onRemoveAuto }: TagInputProps) {
  const [draft, setDraft] = React.useState("")
  const [focused, setFocused] = React.useState(false)
  const [highlight, setHighlight] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const query = draft.trim().toLowerCase()
  const matches = suggestions
    .filter((tag) => !value.includes(tag) && !autoValue.includes(tag) && (!query || tag.includes(query)))
    .slice(0, 6)

  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, "")
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setDraft("")
    setHighlight(0)
  }
  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (query) add(matches[highlight] && matches[highlight].startsWith(query) ? matches[highlight] : draft)
      else if (matches[highlight] && e.key === "Enter") add(matches[highlight])
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1])
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, matches.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Escape") {
      e.stopPropagation()
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30"
      >
        <AnimatePresence initial={false}>
          {value.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="inline-flex h-6 items-center gap-1 rounded-full bg-secondary pr-1 pl-2.5 text-xs font-medium text-secondary-foreground"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={(e) => {
                  e.stopPropagation()
                  remove(tag)
                }}
                className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </motion.span>
          ))}
          {autoValue.map((tag) => (
            <motion.span
              key={`auto-${tag}`}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              title="Added automatically"
              className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-border pr-1 pl-2 text-xs text-muted-foreground"
            >
              <SparklesIcon className="size-3" />
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveAuto?.(tag)
                }}
                className="flex size-4 items-center justify-center rounded-full hover:bg-foreground/10 hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setHighlight(0)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            if (draft.trim()) add(draft)
          }}
          placeholder={value.length || autoValue.length ? "" : "Add tags…"}
          className="h-6 min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <AnimatePresence>
        {focused && matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10"
          >
            {matches.map((tag, i) => (
              <button
                key={tag}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(tag)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left ${i === highlight ? "bg-muted" : ""}`}
              >
                <span className="text-muted-foreground">#</span>
                {tag}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
