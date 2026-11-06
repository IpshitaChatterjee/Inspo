import * as React from "react"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"

/** Rename or remove the tag you're looking at, on every item that has it. */
export function TagMenu({
  tag,
  onRenamed,
  onRemoved,
}: {
  tag: string
  onRenamed: (name: string) => void
  onRemoved: () => void
}) {
  const [renaming, setRenaming] = React.useState(false)
  const [name, setName] = React.useState(tag)

  const rename = async () => {
    const next = name.trim().toLowerCase()
    setRenaming(false)
    if (!next || next === tag) return
    await api.renameTag(tag, next)
    onRenamed(next)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${tag} options`}
              className="self-center"
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuItem
            onClick={() => {
              setName(tag)
              setRenaming(true)
            }}
          >
            <PencilIcon />
            Rename tag
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              await api.renameTag(tag, null)
              onRemoved()
            }}
          >
            <Trash2Icon />
            Remove tag from everything
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Rename #{tag}</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void rename()
            }}
          >
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tag name"
            />
            <Button type="submit" disabled={!name.trim()}>
              Rename
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
