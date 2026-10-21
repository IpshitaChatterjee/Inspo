import { FolderIcon, PlusIcon, XIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Project } from "@/lib/projects"

/** The projects an opened inspo is in, with a way to add it to another or take it out. */
export function ProjectsField({
  itemId,
  projects,
  onChange,
}: {
  itemId: string
  projects: Project[]
  onChange: (projectId: string, add: boolean) => void
}) {
  const inside = projects.filter((p) => p.items.includes(itemId))
  const others = projects.filter(
    (p) => !p.archived && !p.items.includes(itemId)
  )

  return (
    <div className="flex flex-wrap gap-1.5">
      {inside.map((project) => (
        <span
          key={project.id}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary pr-1 pl-2.5 text-xs font-medium text-secondary-foreground"
        >
          <FolderIcon className="size-3.5" />
          {project.name}
          <button
            type="button"
            aria-label={`Take out of ${project.name}`}
            onClick={() => onChange(project.id, false)}
            className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      {others.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-border px-2.5 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
            <PlusIcon className="size-3.5" />
            Add to project
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {others.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onChange(project.id, true)}
              >
                <FolderIcon />
                <span className="truncate">{project.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
