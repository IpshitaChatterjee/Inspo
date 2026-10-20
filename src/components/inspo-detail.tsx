import * as React from "react"
import { motion } from "motion/react"
import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  SparklesIcon,
  ChevronRightIcon,
  FolderOpenIcon,
  GlobeIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { FontMatch } from "@/components/font-match"
import { TagInput } from "@/components/tag-input"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  allTagsOf,
  api,
  GALLERY,
  hasPlayableVideo,
  hostOf,
  mediaUrl,
  type Item,
  type Patch,
} from "@/lib/api"

type InspoDetailProps = {
  item: Item
  morph: boolean
  tags: string[]
  onClose: () => void
  onStep: (direction: -1 | 1) => void
  onUpdate: (id: string, patch: Patch) => void
  onDelete: (item: Item) => void
}

const spring = { type: "spring", stiffness: 260, damping: 30 } as const

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest("input, textarea, [contenteditable='true']")
  )
}

export function InspoDetail({
  item,
  morph,
  tags,
  onClose,
  onStep,
  onUpdate,
  onDelete,
}: InspoDetailProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isTyping(e.target)) (e.target as HTMLElement).blur()
        else onClose()
      }
      if (isTyping(e.target)) return
      if (e.key === "ArrowLeft") onStep(-1)
      if (e.key === "ArrowRight") onStep(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, onStep])

  const ratio =
    item.width && item.height
      ? item.width / item.height
      : item.kind === "link"
        ? 1.25
        : 0.8

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={item.title ?? item.name}
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
          <motion.div
            key={item.id}
            layoutId={morph ? `media-${item.id}` : undefined}
            initial={morph ? undefined : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={morph ? undefined : { opacity: 0, scale: 0.96 }}
            transition={spring}
            style={
              {
                aspectRatio: String(ratio),
                "--ratio": ratio,
              } as React.CSSProperties
            }
            className="pointer-events-auto relative w-[min(100%,calc(60svh*var(--ratio)))] overflow-hidden rounded-2xl bg-muted shadow-2xl ring-1 ring-foreground/10 md:w-[min(100%,calc((100svh-6rem)*var(--ratio)))]"
          >
            <DetailMedia item={item} />
          </motion.div>
        </div>

        <motion.aside
          initial={{ x: 48, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 48, opacity: 0 }}
          transition={{ ...spring, delay: 0.04 }}
          className="pointer-events-auto flex w-full shrink-0 flex-col border-t border-border bg-background/90 backdrop-blur-xl md:h-full md:w-[380px] md:border-t-0 md:border-l"
        >
          <DetailPanel
            key={item.id}
            item={item}
            tags={tags}
            onClose={onClose}
            onStep={onStep}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </motion.aside>
      </div>
    </div>
  )
}

function DetailMedia({ item }: { item: Item }) {
  const [largeReady, setLargeReady] = React.useState(false)

  if (item.kind === "video" && hasPlayableVideo(item)) {
    return (
      <video
        src={mediaUrl(item, "orig")}
        poster={mediaUrl(item, "thumb")}
        controls
        autoPlay
        loop
        playsInline
        className="absolute inset-0 size-full bg-black object-contain"
      />
    )
  }

  if (item.kind === "link") {
    const host = hostOf(item.source)
    return (
      <a
        href={item.source ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="absolute inset-0 flex flex-col justify-between gap-6 bg-card p-8 transition-colors hover:bg-accent md:p-12"
      >
        <div className="flex flex-col gap-4">
          <span className="font-heading text-2xl leading-tight font-medium text-balance md:text-3xl">
            {item.title ?? host}
          </span>
          {item.description && (
            <span className="line-clamp-6 text-base leading-relaxed text-muted-foreground">
              {item.description}
            </span>
          )}
        </div>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <GlobeIcon className="size-4" />
          {host}
          <ArrowUpRightIcon className="size-4" />
        </span>
      </a>
    )
  }

  return (
    <>
      <img
        src={mediaUrl(item, "thumb")}
        alt=""
        draggable={false}
        className="absolute inset-0 size-full object-contain"
      />
      <img
        src={mediaUrl(item, "large")}
        alt={item.title ?? item.name}
        draggable={false}
        onLoad={() => setLargeReady(true)}
        className={`absolute inset-0 size-full object-contain transition-opacity duration-300 ${largeReady ? "opacity-100" : "opacity-0"}`}
      />
    </>
  )
}

type DetailPanelProps = Omit<InspoDetailProps, "morph">

function DetailPanel({
  item,
  tags,
  onClose,
  onStep,
  onUpdate,
  onDelete,
}: DetailPanelProps) {
  const [title, setTitle] = React.useState(item.title ?? "")
  const [note, setNote] = React.useState(item.note)
  const host = hostOf(item.source)

  const saveTitle = () => {
    if (title.trim() !== (item.title ?? ""))
      onUpdate(item.id, { title: title.trim() || null })
  }
  const saveNote = () => {
    if (note !== item.note) onUpdate(item.id, { note })
  }

  const added = new Date(item.addedAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <>
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

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pt-2 pb-6">
        <div className="flex flex-col gap-2">
          {GALLERY ? (
            item.title && (
              <h2 className="font-heading text-xl leading-snug font-medium">
                {item.title}
              </h2>
            )
          ) : (
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              rows={1}
              placeholder="Untitled"
              className="field-sizing-content resize-none bg-transparent font-heading text-xl leading-snug font-medium outline-none placeholder:text-muted-foreground/60"
            />
          )}
          {item.source && (
            <a
              href={item.source}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <GlobeIcon className="size-3.5" />
              {host}
              <ArrowUpRightIcon className="size-3.5" />
            </a>
          )}
        </div>

        {GALLERY ? (
          allTagsOf(item).length > 0 && (
            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {allTagsOf(item).map((tag) => (
                  <span
                    key={tag}
                    className={
                      item.tags.includes(tag)
                        ? "inline-flex h-6 items-center rounded-full bg-secondary px-2.5 text-xs font-medium text-secondary-foreground"
                        : "inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-border px-2 text-xs text-muted-foreground"
                    }
                  >
                    {!item.tags.includes(tag) && (
                      <SparklesIcon className="size-3" />
                    )}
                    {tag}
                  </span>
                ))}
              </div>
            </Field>
          )
        ) : (
          <Field label="Tags">
            <TagInput
              value={item.tags}
              autoValue={item.autoTags.filter(
                (tag) => !item.tags.includes(tag)
              )}
              suggestions={tags}
              onChange={(next) => onUpdate(item.id, { tags: next })}
              onRemoveAuto={(tag) =>
                onUpdate(item.id, {
                  autoTags: item.autoTags.filter((t) => t !== tag),
                })
              }
            />
          </Field>
        )}

        {item.palette.length > 0 && (
          <Field label="Colours">
            <div className="flex gap-1.5">
              {item.palette.map((hex, i) => (
                <Swatch key={hex} hex={hex} name={item.colors[i]} index={i} />
              ))}
            </div>
          </Field>
        )}

        {item.fonts.length > 0 && (
          <Field label="Closest Google Font">
            <FontMatch fonts={item.fonts} />
          </Field>
        )}

        {!GALLERY && (
          <Field label="Note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              placeholder="What caught your eye?"
              className="min-h-24"
            />
          </Field>
        )}

        <Separator />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">Saved</dt>
          <dd>{added}</dd>
          {item.kind !== "link" && !GALLERY && (
            <>
              <dt className="text-muted-foreground">File</dt>
              <dd className="truncate" title={item.id}>
                {item.id}
              </dd>
              {item.width && item.height && (
                <>
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>
                    {item.width} × {item.height} · {formatBytes(item.size)}
                  </dd>
                </>
              )}
            </>
          )}
        </dl>
      </div>

      {!GALLERY && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          {item.kind !== "link" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void api.reveal(item.id)}
            >
              <FolderOpenIcon />
              Show in Finder
            </Button>
          )}
          {/* No confirmation: files go to the Bin, so a slip is easy to undo. */}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => onDelete(item)}
          >
            <Trash2Icon />
            Delete
          </Button>
        </div>
      )}
    </>
  )
}

// A colour from the image: hover shows its hex code, click copies it.
function Swatch({
  hex,
  name,
  index,
}: {
  hex: string
  name?: string
  index: number
}) {
  const [copied, setCopied] = React.useState(false)
  const label = hex.toUpperCase()
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 24,
        delay: index * 0.04,
      }}
    >
      <Tooltip onOpenChange={(open) => !open && setCopied(false)}>
        <TooltipTrigger
          closeOnClick={false}
          render={
            <button
              type="button"
              aria-label={`Copy ${name ?? "colour"} ${label}`}
              onClick={() => {
                void navigator.clipboard.writeText(label)
                setCopied(true)
              }}
              style={{ backgroundColor: hex }}
              className="block size-7 rounded-full ring-1 ring-foreground/10 transition-transform duration-200 ease-out hover:scale-110 active:scale-95"
            />
          }
        />
        <TooltipContent className="font-mono">
          {copied ? (
            <span className="flex items-center gap-1">
              <CheckIcon className="size-3" />
              Copied
            </span>
          ) : (
            label
          )}
        </TooltipContent>
      </Tooltip>
    </motion.span>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
