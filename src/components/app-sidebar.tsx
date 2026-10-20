import * as React from "react"
import { motion } from "motion/react"
import {
  FolderOpenIcon,
  HashIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GalleryStatus } from "@/components/gallery-status"
import {
  allTagsOf,
  api,
  GALLERY,
  type Item,
  type PublishState,
} from "@/lib/api"

export type View = { kind: "all" } | { kind: "tag"; name: string }

type AppSidebarProps = {
  items: Item[]
  view: View
  publish: PublishState | null
  onView: (view: View) => void
  onHelp: () => void
  onPublish: () => void
}

export type TagCount = { name: string; count: number; mine: boolean }

/** Every tag with how many items carry it: your own tags first, then auto ones, busiest first. */
export function countTags(items: Item[]): TagCount[] {
  const counts = new Map<string, TagCount>()
  for (const item of items) {
    for (const tag of allTagsOf(item)) {
      const entry = counts.get(tag) ?? { name: tag, count: 0, mine: false }
      entry.count++
      if (item.tags.includes(tag)) entry.mine = true
      counts.set(tag, entry)
    }
  }
  return [...counts.values()].sort(
    (a, b) =>
      Number(b.mine) - Number(a.mine) ||
      b.count - a.count ||
      a.name.localeCompare(b.name)
  )
}

const TAG_PREVIEW = 30

export function AppSidebar({
  items,
  view,
  publish,
  onView,
  onHelp,
  onPublish,
}: AppSidebarProps) {
  const [renaming, setRenaming] = React.useState<string | null>(null)
  const [showAll, setShowAll] = React.useState(false)

  const tags = React.useMemo(() => countTags(items), [items])

  const isActive = (candidate: View) =>
    candidate.kind === view.kind &&
    (candidate.kind !== "tag" ||
      (view.kind === "tag" && view.name === candidate.name))

  const visibleTags = showAll ? tags : tags.slice(0, TAG_PREVIEW)
  // Keep the selected tag visible even when it's past the preview cut-off.
  if (
    !showAll &&
    view.kind === "tag" &&
    !visibleTags.some((t) => t.name === view.name)
  ) {
    const selected = tags.find((t) => t.name === view.name)
    if (selected) visibleTags.push(selected)
  }

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <SparklesIcon className="size-4" />
        </span>
        <span className="font-heading text-lg font-semibold tracking-tight">
          Inspo
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
        <NavRow
          icon={<LayersIcon />}
          label="Everything"
          count={items.length}
          active={isActive({ kind: "all" })}
          onClick={() => onView({ kind: "all" })}
        />

        <section className="flex flex-col gap-0.5">
          <span className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            Tags
          </span>
          {visibleTags.map((tag) =>
            renaming === tag.name ? (
              <InlineName
                key={tag.name}
                initial={tag.name}
                onDone={async (next) => {
                  setRenaming(null)
                  if (!next || next === tag.name) return
                  await api.renameTag(tag.name, next)
                  if (isActive({ kind: "tag", name: tag.name }))
                    onView({ kind: "tag", name: next.toLowerCase() })
                }}
              />
            ) : (
              <NavRow
                key={tag.name}
                icon={tag.mine ? <HashIcon /> : <SparklesIcon />}
                label={tag.name}
                count={tag.count}
                muted={!tag.mine}
                active={isActive({ kind: "tag", name: tag.name })}
                onClick={() => onView({ kind: "tag", name: tag.name })}
                menu={
                  GALLERY ? undefined : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`${tag.name} options`}
                            className="opacity-0 group-hover/row:opacity-100 aria-expanded:opacity-100"
                          />
                        }
                      >
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setRenaming(tag.name)}>
                          <PencilIcon />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={async () => {
                            await api.renameTag(tag.name, null)
                            if (isActive({ kind: "tag", name: tag.name }))
                              onView({ kind: "all" })
                          }}
                        >
                          <Trash2Icon />
                          Remove from everything
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }
              />
            )
          )}
          {!tags.length && (
            <p className="px-2 py-1 text-sm text-muted-foreground">
              Tags you add show up here.
            </p>
          )}
          {tags.length > TAG_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="px-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground"
            >
              {showAll ? "Show fewer" : `Show all ${tags.length}`}
            </button>
          )}
        </section>
      </nav>

      {!GALLERY && (
        <div className="flex flex-col gap-0.5 border-t border-sidebar-border p-3">
          <GalleryStatus state={publish} onPublish={onPublish} />
          <Button
            variant="ghost"
            size="sm"
            className="mt-1.5 justify-start"
            onClick={onHelp}
          >
            <SparklesIcon />
            How to save from anywhere
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => void api.reveal()}
          >
            <FolderOpenIcon />
            Open folder in Finder
          </Button>
        </div>
      )}
    </aside>
  )
}

type NavRowProps = {
  icon: React.ReactNode
  label: string
  count: number
  active: boolean
  muted?: boolean
  onClick: () => void
  menu?: React.ReactNode
}

function NavRow({
  icon,
  label,
  count,
  active,
  muted,
  onClick,
  menu,
}: NavRowProps) {
  return (
    <div className="group/row relative flex items-center">
      {active && (
        <motion.span
          layoutId="nav-pill"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-md bg-sidebar-accent"
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative flex h-8 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0",
          active
            ? "font-medium text-sidebar-accent-foreground"
            : muted
              ? "text-muted-foreground/70 hover:text-foreground"
              : "text-muted-foreground hover:text-foreground"
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
        <span
          className={cn(
            "ml-auto text-xs text-muted-foreground tabular-nums",
            menu && "group-hover/row:opacity-0"
          )}
        >
          {count}
        </span>
      </button>
      {menu && <div className="absolute right-1">{menu}</div>}
    </div>
  )
}

function InlineName({
  initial,
  onDone,
}: {
  initial: string
  onDone: (name: string | null) => void
}) {
  const [value, setValue] = React.useState(initial)
  const done = React.useRef(false)
  const finish = (name: string | null) => {
    if (done.current) return
    done.current = true
    onDone(name?.trim() || null)
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(value)
        if (e.key === "Escape") finish(null)
      }}
      placeholder="Tag name"
      className="h-8 rounded-md bg-background px-2 text-sm ring-1 ring-ring/60 outline-none"
    />
  )
}
