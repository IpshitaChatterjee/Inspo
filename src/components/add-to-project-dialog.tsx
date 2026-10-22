import * as React from "react"
import { CheckIcon, LinkIcon, PlayIcon, SearchIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { hostOf, mediaUrl, type Item } from "@/lib/api"
import { matches } from "@/lib/inspo-search"
import type { Project } from "@/lib/projects"

type AddToProjectDialogProps = {
  open: boolean
  project: Project
  items: Item[]
  onOpenChange: (open: boolean) => void
  onAdd: (ids: string[]) => void
}

/** Picks inspos from the library to add to a project, without leaving it. */
export function AddToProjectDialog({
  open,
  project,
  items,
  onOpenChange,
  onAdd,
}: AddToProjectDialogProps) {
  const [query, setQuery] = React.useState("")
  const [picked, setPicked] = React.useState<Set<string>>(new Set())

  const choices = items.filter(
    (item) => !project.items.includes(item.id) && matches(item, query.trim())
  )
  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setQuery("")
      setPicked(new Set())
    }
  }

  const left = items.filter((item) => !project.items.includes(item.id)).length

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Add to “{project.name}”
          </DialogTitle>
          <DialogDescription>
            Tick the inspos to add. Ones already in the project aren't shown.
          </DialogDescription>
        </DialogHeader>

        <InputGroup className="h-9 shrink-0 rounded-full bg-muted/60 shadow-none">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, tags, colours, text…"
          />
        </InputGroup>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
          {choices.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {choices.map((item) => (
                <Choice
                  key={item.id}
                  item={item}
                  picked={picked.has(item.id)}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {left === 0
                ? "Everything in your library is already in this project."
                : "Nothing matches that search."}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            disabled={!picked.size}
            onClick={() => {
              onAdd([...picked])
              close(false)
            }}
          >
            {picked.size
              ? `Add ${picked.size} ${picked.size === 1 ? "inspo" : "inspos"}`
              : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Choice({
  item,
  picked,
  onToggle,
}: {
  item: Item
  picked: boolean
  onToggle: () => void
}) {
  const label = item.title ?? hostOf(item.source) ?? item.name
  return (
    <button
      type="button"
      aria-pressed={picked}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={cn(
        "relative aspect-square overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
        picked && "ring-3 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {item.kind === "link" ? (
        <span className="flex size-full flex-col justify-end gap-1 p-2.5 text-left">
          <LinkIcon className="size-3.5 text-muted-foreground" />
          <span className="line-clamp-3 text-xs font-medium">{label}</span>
        </span>
      ) : (
        <img
          src={mediaUrl(item, "thumb")}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      )}
      {item.kind === "video" && (
        <PlayIcon className="absolute bottom-2 left-2 size-4 fill-white text-white drop-shadow" />
      )}
      <span
        className={cn(
          "absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full border-2 shadow-sm",
          picked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-white/90 bg-black/25 text-transparent"
        )}
      >
        <CheckIcon className="size-3" strokeWidth={3} />
      </span>
    </button>
  )
}
