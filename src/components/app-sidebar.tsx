import * as React from "react"
import { motion } from "motion/react"
import {
  HashIcon,
  InboxIcon,
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
import { AppSwitcher } from "@/components/app-switcher"
import { GalleryStatus } from "@/components/gallery-status"
import type { AppName } from "@/hooks/use-current-app"
import {
  allTagsOf,
  api,
  GALLERY,
  type Item,
  type PublishState,
} from "@/lib/api"
import type { TagCount } from "@/lib/tags"

export type View =
  { kind: "all" } | { kind: "untagged" } | { kind: "tag"; name: string }

/** Items with no tags at all: none of yours and none added automatically. */
export const isUntagged = (item: Item) => allTagsOf(item).length === 0

type AppSidebarProps = {
  app: AppName
  counts: Record<AppName, number>
  tags: TagCount[]
  total: number
  untagged: number
  view: View
  publish: PublishState | null
  onApp: (app: AppName) => void
  onView: (view: View) => void
  onPublish: () => void
  onSetPassword: (password: string | null) => Promise<void>
}

const TAG_PREVIEW = 30

export function AppSidebar({
  app,
  counts,
  tags,
  total,
  untagged,
  view,
  publish,
  onApp,
  onView,
  onPublish,
  onSetPassword,
}: AppSidebarProps) {
  const [renaming, setRenaming] = React.useState<string | null>(null)
  const [showAll, setShowAll] = React.useState(false)

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
      <div className="px-5 pt-5 pb-4">
        <AppSwitcher app={app} counts={counts} onChange={onApp} />
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-0.5">
          <NavRow
            icon={<LayersIcon />}
            label="Everything"
            count={total}
            active={isActive({ kind: "all" })}
            onClick={() => onView({ kind: "all" })}
          />
          {/* Only when there's something untagged (or you're looking at it). */}
          {(untagged > 0 || isActive({ kind: "untagged" })) && (
            <NavRow
              icon={<InboxIcon />}
              label="Untagged"
              count={untagged}
              active={isActive({ kind: "untagged" })}
              onClick={() => onView({ kind: "untagged" })}
            />
          )}
        </div>

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
                  GALLERY || app !== "inspo" ? undefined : (
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
                          Remove
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

      {!GALLERY && app === "inspo" && (
        <div className="border-t border-sidebar-border p-3">
          <GalleryStatus
            state={publish}
            onPublish={onPublish}
            onSetPassword={onSetPassword}
          />
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
