import * as React from "react"
import { motion } from "motion/react"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Project } from "@/lib/projects"

export type ProjectTab = "collected" | "moodboard"

const TABS: { value: ProjectTab; label: string }[] = [
  { value: "collected", label: "Collected" },
  { value: "moodboard", label: "Moodboard" },
]

type ProjectHeaderProps = {
  project: Project
  count: number
  tab: ProjectTab
  readOnly: boolean
  onTab: (tab: ProjectTab) => void
  onRename: (name: string) => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
}

/** A project's name, its Collected / Moodboard switch, and its menu. */
export function ProjectHeader({
  project,
  count,
  tab,
  readOnly,
  onTab,
  onRename,
  onArchive,
  onDelete,
}: ProjectHeaderProps) {
  const [renaming, setRenaming] = React.useState(false)
  const [draft, setDraft] = React.useState(project.name)

  const finish = (save: boolean) => {
    setRenaming(false)
    const name = draft.trim()
    if (save && name && name !== project.name) onRename(name)
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
      <div className="flex min-w-0 items-baseline gap-3">
        {renaming ? (
          <input
            autoFocus
            aria-label="Project name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => finish(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") finish(true)
              if (e.key === "Escape") finish(false)
            }}
            className="min-w-0 rounded-md bg-transparent font-heading text-3xl font-semibold tracking-tight ring-1 ring-ring/60 outline-none"
          />
        ) : (
          <motion.h1
            key={project.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="truncate font-heading text-3xl font-semibold tracking-tight"
          >
            {project.name}
          </motion.h1>
        )}
        <span className="text-sm text-muted-foreground tabular-nums">
          {count}
        </span>
        {project.archived && <Badge variant="secondary">Archived</Badge>}
      </div>

      <div className="flex items-center rounded-full bg-muted/60 p-0.5">
        {TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={tab === option.value}
            onClick={() => onTab(option.value)}
            className={cn(
              "relative h-8 rounded-full px-3.5 text-sm transition-colors",
              tab === option.value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === option.value && (
              <motion.span
                layoutId="project-tab"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-foreground/5"
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        ))}
      </div>

      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Project options"
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem
              onClick={() => {
                setDraft(project.name)
                setRenaming(true)
              }}
            >
              <PencilIcon />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(!project.archived)}>
              {project.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
              {project.archived ? "Restore" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
