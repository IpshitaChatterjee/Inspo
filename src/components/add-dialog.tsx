import * as React from "react"
import { ImagePlusIcon, LinkIcon } from "lucide-react"

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
import { looksLikeUrl } from "@/hooks/use-saver"

type AddDialogProps = {
  open: boolean
  /** Where saves go besides the library, e.g. "with #type". */
  where: string
  onOpenChange: (open: boolean) => void
  onLink: (url: string) => void
  onFiles: (files: File[]) => void
}

export function AddDialog({
  open,
  where,
  onOpenChange,
  onLink,
  onFiles,
}: AddDialogProps) {
  const [url, setUrl] = React.useState("")
  const fileInput = React.useRef<HTMLInputElement>(null)
  const valid =
    looksLikeUrl(url) || /^[\w-]+(\.[\w-]+)+\/?\S*$/.test(url.trim())

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onLink(url.trim())
    setUrl("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Save inspiration</DialogTitle>
          <DialogDescription>
            Paste a link and the images or video behind it get saved to your
            iCloud folder
            {where && ` ${where}`}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex gap-2">
          <InputGroup className="h-10">
            <InputGroupAddon>
              <LinkIcon />
            </InputGroupAddon>
            <InputGroupInput
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://x.com/…"
            />
          </InputGroup>
          <Button
            type="submit"
            size="lg"
            className="h-10 px-4"
            disabled={!valid}
          >
            Save
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-8 text-center transition-colors hover:border-ring hover:bg-muted/50"
        >
          <ImagePlusIcon className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium">Choose images or videos</span>
          <span className="text-xs text-muted-foreground">
            You can also drop files anywhere on the page, or paste with ⌘V
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,video/*,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ""
            if (files.length) {
              onFiles(files)
              onOpenChange(false)
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
