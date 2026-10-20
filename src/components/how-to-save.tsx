import * as React from "react"
import { BookmarkIcon, LaptopIcon, SmartphoneIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"

type HowToSaveProps = {
  open: boolean
  folder: string
  onOpenChange: (open: boolean) => void
}

export function HowToSave({ open, folder, onOpenChange }: HowToSaveProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Save from anywhere</DialogTitle>
          <DialogDescription>
            Everything lives in the <b className="font-medium text-foreground">Inspo</b> folder in your iCloud
            Drive. Whatever lands there shows up here.
          </DialogDescription>
        </DialogHeader>

        <Section icon={<SmartphoneIcon />} title="On your iPhone">
          <Step n={1}>
            <b>Images and videos:</b> tap Share → <i>Save to Files</i> → iCloud Drive → <i>Inspo</i>.
          </Step>
          <Step n={2}>
            <b>Links</b> (a tweet, a Dribbble shot): set up a Shortcut once, and it appears in every Share menu.
            <ol className="mt-2 flex list-[lower-alpha] flex-col gap-1 pl-5 text-muted-foreground">
              <li>Open the Shortcuts app → <i>+</i> → name it “Save to Inspo”.</li>
              <li>Tap the <i>ⓘ</i> button and turn on <i>Show in Share Sheet</i>.</li>
              <li>Add the action <i>Text</i> and put <i>Shortcut Input</i> inside it.</li>
              <li>
                Add <i>Save File</i>, pick iCloud Drive → <i>Inspo</i> → <i>_inbox</i>, and turn off <i>Ask Where to Save</i>.
              </li>
            </ol>
            <p className="mt-2 text-muted-foreground">
              Now Share → <i>Save to Inspo</i> on any link. The app on your Mac grabs the images or video from it.
              (Shortcuts menus move around between iOS versions, so the names may differ slightly.)
            </p>
          </Step>
        </Section>

        <Section icon={<LaptopIcon />} title="On your Mac">
          <Step n={1}>Drag images, videos or links onto this window.</Step>
          <Step n={2}>
            Copy an image or link and press <Kbd>⌘</Kbd>
            <Kbd>V</Kbd> here.
          </Step>
          <Step n={3}>Save or drag files into the Inspo folder in Finder.</Step>
          <Step n={4}>
            The “Save to Inspo” Shortcut also shows up in Safari’s Share menu once it syncs to your Mac.
          </Step>
        </Section>

        <Section icon={<BookmarkIcon />} title="One-click button for your browser">
          <p className="text-sm">
            Drag this to your bookmarks bar. Click it on any page to save that page.
          </p>
          <Bookmarklet />
        </Section>

        <p className="rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Links saved from your phone are picked up when this app is running on your Mac. If it's closed, they
          wait in the inbox until next time. Folder: <span className="break-all text-foreground">{folder}</span>
        </p>
      </DialogContent>
    </Dialog>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-heading text-sm font-medium [&_svg]:size-4 [&_svg]:text-muted-foreground">
        {icon}
        {title}
      </h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm leading-relaxed">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-medium text-secondary-foreground">
        {n}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// React refuses to render javascript: links, so the href is set by hand.
function Bookmarklet() {
  const ref = React.useRef<HTMLAnchorElement>(null)
  React.useEffect(() => {
    const target = `${window.location.origin}/?add=`
    ref.current?.setAttribute(
      "href",
      `javascript:void(window.open('${target}'+encodeURIComponent(location.href),'inspo'))`
    )
  }, [])
  return (
    <a
      ref={ref}
      onClick={(e) => e.preventDefault()}
      className="inline-flex w-fit cursor-grab items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm active:cursor-grabbing"
    >
      <BookmarkIcon className="size-4" />
      Save to Inspo
    </a>
  )
}
