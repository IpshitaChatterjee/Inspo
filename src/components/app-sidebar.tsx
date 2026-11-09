import * as React from "react"
import { motion } from "motion/react"
import { InboxIcon, LayersIcon } from "lucide-react"
import { cn } from "cn"

import { AppSwitcher } from "@/components/app-switcher"
import { GalleryStatus } from "@/components/gallery-status"
import type { AppName } from "@/hooks/use-current-app"
import { allTagsOf, GALLERY, type Item, type PublishState } from "@/lib/api"

export type View =
  { kind: "all" } | { kind: "untagged" } | { kind: "tag"; name: string }

/** Items with no tags at all: none of yours and none added automatically. */
export const isUntagged = (item: Item) => allTagsOf(item).length === 0

type AppSidebarProps = {
  app: AppName
  counts: Record<AppName, number>
  total: number
  untagged: number
  view: View
  publish: PublishState | null
  onApp: (app: AppName) => void
  onView: (view: View) => void
  onPublish: () => void
  onSetPassword: (password: string | null) => Promise<void>
}

export function AppSidebar({
  app,
  counts,
  total,
  untagged,
  view,
  publish,
  onApp,
  onView,
  onPublish,
  onSetPassword,
}: AppSidebarProps) {
  const isActive = (candidate: View) =>
    candidate.kind === view.kind &&
    (candidate.kind !== "tag" ||
      (view.kind === "tag" && view.name === candidate.name))

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-5 pt-5 pb-4">
        <AppSwitcher app={app} counts={counts} onChange={onApp} />
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pt-1 pb-4">
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
  onClick: () => void
}

function NavRow({ icon, label, count, active, onClick }: NavRowProps) {
  return (
    <div className="group/row relative flex items-center">
      {active && (
        <motion.span
          layoutId="nav-pill"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-lg border border-black/[0.07] bg-background shadow-[0_1px_2px_rgb(0_0_0/0.04),0_2px_8px_rgb(0_0_0/0.05)] dark:border-white/8 dark:bg-sidebar-accent dark:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_2px_8px_rgb(0_0_0/0.3)]"
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0",
          active
            ? "font-medium text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {count}
        </span>
      </button>
    </div>
  )
}
