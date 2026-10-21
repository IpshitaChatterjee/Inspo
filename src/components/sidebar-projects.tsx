import * as React from "react"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ChevronRightIcon,
  FolderIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import {
  InlineName,
  NavRow,
  sameView,
  type View,
} from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Project } from "@/lib/projects"

type SidebarProjectsProps = {
  projects: Project[]
  view: View
  readOnly: boolean
  onView: (view: View) => void
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (project: Project) => void
}

/** Projects in the sidebar: the active ones, with finished ones tucked under Archived. */
export function SidebarProjects({
  projects,
  view,
  readOnly,
  onView,
  onCreate,
  onRename,
  onArchive,
  onDelete,
}: SidebarProjectsProps) {
  const [adding, setAdding] = React.useState(false)
  const [renaming, setRenaming] = React.useState<string | null>(null)
  const [showArchived, setShowArchived] = React.useState(false)
  const active = projects.filter((p) => !p.archived)
  const archived = projects.filter((p) => p.archived)

  if (readOnly && !active.length) return null

  const row = (project: Project) =>
    renaming === project.id ? (
      <InlineName
        key={project.id}
        initial={project.name}
        placeholder="Project name"
        onDone={(name) => {
          setRenaming(null)
          if (name && name !== project.name) onRename(project.id, name)
        }}
      />
    ) : (
      <NavRow
        key={project.id}
        icon={<FolderIcon />}
        label={project.name}
        count={project.items.length}
        muted={project.archived}
        active={sameView(view, { kind: "project", id: project.id })}
        onClick={() => onView({ kind: "project", id: project.id })}
        menu={
          readOnly ? undefined : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`${project.name} options`}
                    className="opacity-0 group-hover/row:opacity-100 aria-expanded:opacity-100"
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setRenaming(project.id)}>
                  <PencilIcon />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onArchive(project.id, !project.archived)}
                >
                  {project.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                  {project.archived ? "Restore" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(project)}
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />
    )

  return (
    <section className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-xs font-medium text-muted-foreground">
          Projects
        </span>
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="New project"
            onClick={() => setAdding(true)}
          >
            <PlusIcon />
          </Button>
        )}
      </div>
      {active.map(row)}
      {adding && (
        <InlineName
          initial=""
          placeholder="Project name"
          onDone={(name) => {
            setAdding(false)
            if (name) onCreate(name)
          }}
        />
      )}
      {!active.length && !adding && !readOnly && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
        >
          Start a project…
        </button>
      )}
      {!readOnly && archived.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((s) => !s)}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronRightIcon
              className={`size-3.5 transition-transform ${showArchived ? "rotate-90" : ""}`}
            />
            Archived ({archived.length})
          </button>
          {showArchived && archived.map(row)}
        </>
      )}
    </section>
  )
}
