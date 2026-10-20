import * as React from "react"
import { motion } from "motion/react"
import { CodeIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { ComponentBoundary } from "@/components/component-boundary"
import { ComponentControls } from "@/components/component-controls"
import { DetailNav, DetailShell, Field } from "@/components/detail-shell"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { copyText } from "@/lib/copy-text"
import type { LibraryEntry } from "@/library"
import { bakeValues, forCopy } from "@/library/code"
import { defaultValues, type ControlValue, type Values } from "@/library/types"

type LoadedComponent = Awaited<ReturnType<LibraryEntry["load"]>>["default"]

type ComponentDetailProps = {
  entry: LibraryEntry
  onClose: () => void
  onStep: (direction: -1 | 1) => void
}

const spring = { type: "spring", stiffness: 260, damping: 30 } as const
const RATIO = 4 / 3

// An opened component: the live component large on the left, its details,
// controls and copy buttons on the right.
export function ComponentDetail({
  entry,
  onClose,
  onStep,
}: ComponentDetailProps) {
  const { meta } = entry
  const [values, setValues] = React.useState(() => defaultValues(meta.controls))
  // Each component opens with its own defaults.
  const [shownSlug, setShownSlug] = React.useState(meta.slug)
  if (shownSlug !== meta.slug) {
    setShownSlug(meta.slug)
    setValues(defaultValues(meta.controls))
  }

  const [loaded, setLoaded] = React.useState<{
    slug: string
    Component: LoadedComponent
  } | null>(null)
  const [failed, setFailed] = React.useState<string | null>(null)
  React.useEffect(() => {
    let current = true
    entry
      .load()
      .then((mod) => {
        if (current)
          setLoaded({ slug: entry.meta.slug, Component: mod.default })
      })
      .catch(() => {
        if (current) setFailed(entry.meta.slug)
      })
    return () => {
      current = false
    }
  }, [entry])
  const Loaded = loaded?.slug === meta.slug ? loaded.Component : null

  const fallback = (
    <div className="flex size-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
      This component couldn't render.
    </div>
  )

  return (
    <DetailShell
      label={meta.title}
      onClose={onClose}
      onStep={onStep}
      media={
        <motion.div
          key={meta.slug}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={spring}
          style={
            {
              aspectRatio: String(RATIO),
              "--ratio": RATIO,
            } as React.CSSProperties
          }
          className="pointer-events-auto relative w-[min(100%,calc(60svh*var(--ratio)))] overflow-hidden rounded-2xl bg-muted shadow-2xl ring-1 ring-foreground/10 md:w-[min(100%,calc((100svh-6rem)*var(--ratio)))]"
        >
          <div className="absolute inset-0">
            {Loaded ? (
              <ComponentBoundary fallback={fallback} resetKey={values}>
                {React.createElement(Loaded, values, meta.demo)}
              </ComponentBoundary>
            ) : failed === meta.slug ? (
              fallback
            ) : (
              <div className="flex size-full items-center justify-center">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </motion.div>
      }
      panel={
        <ComponentPanel
          key={meta.slug}
          entry={entry}
          values={values}
          onChange={(key, value) =>
            setValues((current) => ({ ...current, [key]: value }))
          }
          onReset={() => setValues(defaultValues(meta.controls))}
          onClose={onClose}
          onStep={onStep}
        />
      }
    />
  )
}

type ComponentPanelProps = {
  entry: LibraryEntry
  values: Values
  onChange: (key: string, value: ControlValue) => void
  onReset: () => void
  onClose: () => void
  onStep: (direction: -1 | 1) => void
}

async function copy(text: string, done: string) {
  if (await copyText(text)) toast.success(done)
  else toast.error("Couldn't copy. Your browser blocked it.")
}

function ComponentPanel({
  entry,
  values,
  onChange,
  onReset,
  onClose,
  onStep,
}: ComponentPanelProps) {
  const { meta } = entry
  const changed = meta.controls.some(
    (c) => (values[c.key] ?? c.default) !== c.default
  )

  return (
    <>
      <DetailNav onStep={onStep} onClose={onClose} />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 pt-2 pb-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-xl leading-snug font-medium">
            {meta.title}
          </h2>
          {meta.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {meta.description}
            </p>
          )}
        </div>

        {meta.tags.length > 0 && (
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex h-6 items-center rounded-full bg-secondary px-2.5 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Field>
        )}

        {meta.controls.length > 0 && (
          <Field
            label="Controls"
            action={
              <button
                type="button"
                onClick={onReset}
                disabled={!changed}
                className="text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground focus-visible:underline disabled:pointer-events-none disabled:opacity-40"
              >
                Reset
              </button>
            }
          >
            <div className="pt-1">
              <ComponentControls
                controls={meta.controls}
                values={values}
                onChange={onChange}
              />
            </div>
          </Field>
        )}
      </div>

      {/* Phones scroll the whole view, so the buttons stay in reach at the bottom. */}
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-background/90 px-6 py-3 backdrop-blur-xl md:static md:bg-transparent md:backdrop-blur-none">
        <Button
          className="flex-1"
          onClick={() =>
            void copy(
              meta.prompt(forCopy(values, meta.controls)),
              "Prompt copied"
            )
          }
        >
          <SparklesIcon />
          Copy prompt
        </Button>
        <Button
          className="flex-1 bg-foreground text-background hover:bg-foreground/85"
          onClick={() => {
            try {
              void copy(
                bakeValues(entry.source, values, meta.controls),
                "Code copied — paste it into a React or Next.js file"
              )
            } catch {
              toast.error("Couldn't copy. Something went wrong.")
            }
          }}
        >
          <CodeIcon />
          Copy code
        </Button>
      </div>
    </>
  )
}
