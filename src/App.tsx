import * as React from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import {
  ImagePlusIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { cn } from "cn"

import { AppSwitcher } from "@/components/app-switcher"
import { AddDialog } from "@/components/add-dialog"
import { AppSidebar, isUntagged, type View } from "@/components/app-sidebar"
import { DropOverlay } from "@/components/drop-overlay"
import { EditLock } from "@/components/edit-lock"
import { ComponentDetail } from "@/components/component-detail"
import { ComponentGrid } from "@/components/component-grid"
import { CanEditContext } from "@/lib/gallery-edits"
import { HowToSave } from "@/components/how-to-save"
import { InspoDetail } from "@/components/inspo-detail"
import { MasonryGrid } from "@/components/masonry-grid"
import { MobileTags } from "@/components/mobile-tags"
import { countTags, type TagCount } from "@/lib/tags"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { useCurrentApp, type AppName } from "@/hooks/use-current-app"
import { useLibrary } from "@/hooks/use-library"
import { looksLikeUrl, useSaver } from "@/hooks/use-saver"
import { allTagsOf, GALLERY, hostOf, type Item, type Kind } from "@/lib/api"
import { library as componentLibrary, type LibraryEntry } from "@/library"
import { componentTagCounts, filterComponents } from "@/library/search"

type TypeFilter = "all" | Exclude<Kind, "link">

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
]

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest("input, textarea, [contenteditable='true']")
  )
}

// Colour words people use, mapped to the names the Mac gives colours.
// Teal reads as green to some eyes and blue to others, so it counts for both.
const COLOR_WORDS: Record<string, string[]> = {
  red: ["red"],
  orange: ["orange"],
  yellow: ["yellow"],
  green: ["green", "teal"],
  teal: ["teal"],
  cyan: ["teal"],
  turquoise: ["teal"],
  blue: ["blue", "teal"],
  purple: ["purple"],
  violet: ["purple"],
  pink: ["pink"],
  brown: ["brown"],
  beige: ["beige"],
  cream: ["beige"],
  black: ["black"],
  dark: ["black"],
  white: ["white"],
  light: ["white"],
  gray: ["gray"],
  grey: ["gray"],
}

function matches(item: Item, query: string) {
  if (!query) return true
  const haystack = [
    item.title,
    item.description,
    item.note,
    item.name,
    item.text,
    hostOf(item.source),
    ...item.fonts.map((font) => font.family),
    ...allTagsOf(item),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((raw) => {
      const word = raw.replace(/^#/, "")
      const colors = COLOR_WORDS[word]
      if (colors) return colors.some((color) => item.colors.includes(color))
      return haystack.includes(word)
    })
}

export function App() {
  const {
    library,
    error,
    fresh,
    update,
    remove,
    publish,
    publishNow,
    canEdit,
    unlockEditing,
    lockEditing,
    setEditingPassword,
    updateComponentTags,
  } = useLibrary()
  // Components with your tag changes applied (saved in the iCloud library).
  const componentEntries = React.useMemo(
    () =>
      componentLibrary.map((entry) => {
        const tags = library?.componentTags?.[entry.meta.slug]
        return tags ? { ...entry, meta: { ...entry.meta, tags } } : entry
      }),
    [library]
  )
  const [app, setApp] = useCurrentApp()
  const [view, setView] = React.useState<View>({ kind: "all" })
  const [type, setType] = React.useState<TypeFilter>("all")
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState<{ id: string; morph: boolean } | null>(
    null
  )
  const [openComponent, setOpenComponent] = React.useState<LibraryEntry | null>(
    null
  )
  const [adding, setAdding] = React.useState(false)
  const [help, setHelp] = React.useState(false)
  const searchRef = React.useRef<HTMLInputElement>(null)

  // New saves pick up the tag you're looking at.
  const tag = view.kind === "tag" ? view.name : null
  const { saveFiles, saveLink } = useSaver(tag)

  const items = React.useMemo(() => library?.items ?? [], [library])
  const allTags = React.useMemo(
    () => [...new Set(items.flatMap(allTagsOf))].sort(),
    [items]
  )

  // The sidebar and phone chips are shared, so each app hands them its own tags.
  const componentTags = React.useMemo<TagCount[]>(
    () => componentTagCounts(componentEntries),
    [componentEntries]
  )
  const inspoTags = React.useMemo(() => countTags(items), [items])
  const inspoUntagged = React.useMemo(
    () => items.filter(isUntagged).length,
    [items]
  )
  const inComponents = app === "components"
  const sidebarTags = inComponents ? componentTags : inspoTags
  const sidebarUntagged = inComponents
    ? componentEntries.filter((entry) => entry.meta.tags.length === 0).length
    : inspoUntagged

  // Each app searches only its own things.
  const visibleComponents = React.useMemo(
    () => (inComponents ? filterComponents(componentEntries, view, query) : []),
    [inComponents, componentEntries, view, query]
  )
  const visible = React.useMemo(
    () =>
      inComponents
        ? []
        : items.filter(
            (item) =>
              (view.kind === "all" ||
                (view.kind === "untagged"
                  ? isUntagged(item)
                  : allTagsOf(item).includes(view.name))) &&
              (type === "all" || item.kind === type) &&
              matches(item, query.trim())
          ),
    [inComponents, items, view, type, query]
  )

  const openItem = open ? (items.find((i) => i.id === open.id) ?? null) : null

  const step = React.useCallback(
    (direction: -1 | 1) => {
      setOpen((current) => {
        if (!current || !visible.length) return current
        const index = visible.findIndex((i) => i.id === current.id)
        const next =
          visible[(index + direction + visible.length) % visible.length]
        return { id: next.id, morph: false }
      })
    },
    [visible]
  )

  const close = React.useCallback(() => setOpen(null), [])

  // ← → move through the components on screen, wrapping around.
  const stepComponent = React.useCallback(
    (direction: -1 | 1) => {
      setOpenComponent((current) => {
        const count = visibleComponents.length
        if (!current || !count) return current
        const index = visibleComponents.indexOf(current)
        if (index === -1)
          return visibleComponents[direction === 1 ? 0 : count - 1]
        return visibleComponents[(index + direction + count) % count]
      })
    },
    [visibleComponents]
  )

  const closeComponent = React.useCallback(() => setOpenComponent(null), [])

  // Paste an image or a link anywhere to save it.
  React.useEffect(() => {
    if (GALLERY || inComponents) return
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      const files = [...(e.clipboardData?.files ?? [])]
      if (files.length) {
        e.preventDefault()
        void saveFiles(files)
        return
      }
      const text = e.clipboardData?.getData("text/plain") ?? ""
      if (looksLikeUrl(text)) {
        e.preventDefault()
        void saveLink(text)
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [saveFiles, saveLink, inComponents])

  // "/" or ⌘K jumps to search.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || openComponent) return
      if (
        (e.key === "/" && !isTyping(e.target)) ||
        (e.key === "k" && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, openComponent])

  // The browser bookmark button opens the app with ?add=<page>.
  const handledAdd = React.useRef(false)
  React.useEffect(() => {
    if (handledAdd.current || GALLERY) return
    handledAdd.current = true
    const url = new URLSearchParams(window.location.search).get("add")
    if (!url) return
    window.history.replaceState(null, "", window.location.pathname)
    // Links are saved into Inspo, so leave Components first.
    setApp("inspo")
    void saveLink(url)
  }, [saveLink, setApp])

  const heading =
    view.kind === "all"
      ? inComponents
        ? "Components"
        : "Everything"
      : view.kind === "untagged"
        ? "Untagged"
        : `#${view.name}`
  const switchApp = (next: AppName) => {
    if (next === app) return
    setApp(next)
    setView({ kind: "all" })
    setQuery("")
    window.scrollTo({ top: 0 })
  }
  const resetKey = `${heading}|${type}|${query}`
  const filtering = type !== "all" || query.trim() !== ""
  const filteringComponents = query.trim() !== ""

  return (
    <CanEditContext.Provider value={canEdit}>
      <LayoutGroup>
        <div className="flex min-h-svh bg-background">
          <AppSidebar
            app={app}
            counts={{
              inspo: items.length,
              components: componentEntries.length,
            }}
            tags={sidebarTags}
            total={inComponents ? componentEntries.length : items.length}
            untagged={sidebarUntagged}
            view={view}
            publish={publish}
            onApp={switchApp}
            onPublish={() => void publishNow()}
            onSetPassword={setEditingPassword}
            onView={(next) => {
              setView(next)
              window.scrollTo({ top: 0 })
            }}
          />

          <main className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-transparent bg-background/80 px-4 py-3 backdrop-blur-xl md:px-8">
              {/* The sidebar (and its switcher) is hidden on phones. */}
              <div className="md:hidden">
                <AppSwitcher
                  compact
                  app={app}
                  counts={{
                    inspo: items.length,
                    components: componentEntries.length,
                  }}
                  onChange={switchApp}
                />
              </div>
              <InputGroup className="h-9 max-w-md rounded-full bg-muted/60 shadow-none">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Escape" && (setQuery(""), e.currentTarget.blur())
                  }
                  placeholder={
                    inComponents
                      ? "Search components…"
                      : "Search titles, tags, colours, text…"
                  }
                />
                <InputGroupAddon align="inline-end">
                  <Kbd>/</Kbd>
                </InputGroupAddon>
              </InputGroup>

              {!inComponents && <TypeSwitch value={type} onChange={setType} />}

              <div className="ml-auto flex items-center gap-1">
                {GALLERY && (
                  <EditLock
                    unlocked={canEdit}
                    onUnlock={unlockEditing}
                    onLock={lockEditing}
                  />
                )}
                <ThemeToggle />
                {!GALLERY && !inComponents && (
                  <Button
                    onClick={() => setAdding(true)}
                    className="rounded-full pr-3.5"
                  >
                    <PlusIcon />
                    Save
                  </Button>
                )}
              </div>
            </header>

            {error && (
              <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive md:mx-8">
                <TriangleAlertIcon className="size-4" />
                {error}
              </div>
            )}

            <div className="flex flex-1 flex-col gap-5 px-4 pt-4 pb-16 md:px-8">
              <MobileTags
                tags={sidebarTags}
                untagged={sidebarUntagged}
                view={view}
                onView={(next) => {
                  setView(next)
                  window.scrollTo({ top: 0 })
                }}
              />
              <div className="flex items-baseline gap-3">
                <motion.h1
                  key={heading}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-heading text-3xl font-semibold tracking-tight"
                >
                  {heading}
                </motion.h1>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {inComponents ? visibleComponents.length : visible.length}
                  {inComponents
                    ? filteringComponents && ` of ${componentEntries.length}`
                    : filtering && ` of ${items.length}`}
                </span>
              </div>

              {inComponents ? (
                visibleComponents.length ? (
                  <ComponentGrid
                    entries={visibleComponents}
                    onOpen={setOpenComponent}
                  />
                ) : (
                  <Empty className="flex-1">
                    <EmptyHeader>
                      <EmptyTitle className="font-heading">
                        {componentEntries.length
                          ? "No components match"
                          : "Nothing here yet"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {componentEntries.length
                          ? "Try another search or tag."
                          : "Components you make will show up here."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )
              ) : !library && !error ? (
                <div className="flex flex-1 items-center justify-center">
                  <Spinner className="size-6 text-muted-foreground" />
                </div>
              ) : visible.length ? (
                <MasonryGrid
                  items={visible}
                  resetKey={resetKey}
                  fresh={fresh}
                  openId={open?.morph ? open.id : null}
                  onOpen={(item) => setOpen({ id: item.id, morph: true })}
                />
              ) : (
                <EmptyState
                  filtering={filtering || view.kind !== "all" || GALLERY}
                  onAdd={() => setAdding(true)}
                  onHelp={() => setHelp(true)}
                />
              )}
            </div>
          </main>
        </div>

        <AnimatePresence>
          {openItem && (
            <InspoDetail
              key="detail"
              item={openItem}
              morph={open?.morph ?? false}
              tags={allTags}
              onClose={close}
              onStep={step}
              onUpdate={update}
              onDelete={(item) => {
                step(1)
                if (visible.length <= 1) close()
                void remove(item)
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {inComponents && openComponent && (
            <ComponentDetail
              key="component-detail"
              entry={
                componentEntries.find(
                  (entry) => entry.meta.slug === openComponent.meta.slug
                ) ?? openComponent
              }
              tagSuggestions={componentTags.map((t) => t.name)}
              onTagsChange={updateComponentTags}
              onClose={closeComponent}
              onStep={stepComponent}
            />
          )}
        </AnimatePresence>

        {!GALLERY && !inComponents && (
          <>
            <AddDialog
              open={adding}
              tag={tag}
              onOpenChange={setAdding}
              onLink={saveLink}
              onFiles={saveFiles}
            />
            <HowToSave
              open={help}
              folder={library?.folder ?? ""}
              onOpenChange={setHelp}
            />
            <DropOverlay tag={tag} onFiles={saveFiles} onLink={saveLink} />
          </>
        )}
      </LayoutGroup>
    </CanEditContext.Provider>
  )
}

function TypeSwitch({
  value,
  onChange,
}: {
  value: TypeFilter
  onChange: (value: TypeFilter) => void
}) {
  return (
    <div className="hidden items-center rounded-full bg-muted/60 p-0.5 lg:flex">
      {TYPE_FILTERS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "relative h-8 rounded-full px-3.5 text-sm transition-colors",
            value === option.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {value === option.value && (
            <motion.span
              layoutId="type-pill"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-foreground/5"
            />
          )}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}

function EmptyState({
  filtering,
  onAdd,
  onHelp,
}: {
  filtering: boolean
  onAdd: () => void
  onHelp: () => void
}) {
  if (filtering) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyTitle className="font-heading">Nothing here yet</EmptyTitle>
          <EmptyDescription>
            Try another search or tag, or drop something in to fill it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ImagePlusIcon />
        </EmptyMedia>
        <EmptyTitle className="font-heading text-xl">
          Your inspiration lives here
        </EmptyTitle>
        <EmptyDescription>
          Drop images or videos onto this window, paste a link with ⌘V, or save
          into the Inspo folder in iCloud Drive from your iPhone.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button onClick={onAdd}>
          <PlusIcon />
          Save something
        </Button>
        <Button variant="outline" onClick={onHelp}>
          How to save from anywhere
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export default App
