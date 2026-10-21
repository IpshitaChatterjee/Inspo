import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { FolderMinusIcon, FolderPlusIcon, PlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { Project } from "@/lib/projects"

type SelectionBarProps = {
  count: number
  projects: Project[]
  /** The project being looked at, if any: offers "Remove from project". */
  current: Project | null
  onAdd: (projectId: string) => void
  onCreate: (name: string) => void
  onRemove: () => void
  onClear: () => void
}

/** Floats at the bottom while inspos are selected. */
export function SelectionBar({
  count,
  projects,
  current,
  onAdd,
  onCreate,
  onRemove,
  onClear,
}: SelectionBarProps) {
  const [naming, setNaming] = React.useState(false)

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-full bg-foreground py-1.5 pr-1.5 pl-4 text-sm text-background shadow-2xl"
          >
            <span className="mr-1 tabular-nums">{count} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button size="sm" className="rounded-full" />}
              >
                <FolderPlusIcon />
                Add to project
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="center" className="w-56">
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => onAdd(project.id)}
                  >
                    <span className="truncate">{project.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {project.items.length}
                    </span>
                  </DropdownMenuItem>
                ))}
                {projects.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => setNaming(true)}>
                  <PlusIcon />
                  New project…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {current && (
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={onRemove}
              >
                <FolderMinusIcon />
                Remove from project
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Clear selection"
              className="rounded-full text-background hover:bg-background/15 hover:text-background"
              onClick={onClear}
            >
              <XIcon />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <NewProjectDialog
        open={naming}
        onOpenChange={setNaming}
        description={`It starts with the ${count} ${count === 1 ? "inspo" : "inspos"} you picked.`}
        onCreate={onCreate}
      />
    </>
  )
}

export function NewProjectDialog({
  open,
  onOpenChange,
  description,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  description: string
  onCreate: (name: string) => void
}) {
  const [name, setName] = React.useState("")
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate(name.trim())
    setName("")
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">New project</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            autoFocus
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={!name.trim()}>
            Create project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
