import type { ComponentType, ReactNode } from "react"
import type { ComponentMeta, Values } from "./types"

type LibraryComponent = ComponentType<
  Partial<Values> & { children?: ReactNode }
>

export type LibraryEntry = {
  meta: ComponentMeta
  source: string // raw text of component.tsx
  load: () => Promise<{ default: LibraryComponent }>
}

// Each component lives in its own folder: meta.tsx (title, controls, prompt)
// and component.tsx (the file people copy). The component itself only loads
// when it's shown; its text is bundled so Copy code works straight away.
const metas = import.meta.glob<{ default: ComponentMeta }>("./*/meta.tsx", {
  eager: true,
})
const sources = import.meta.glob<string>("./*/component.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
})
const loaders = import.meta.glob<{ default: LibraryComponent }>(
  "./*/component.tsx"
)

export const library: LibraryEntry[] = Object.entries(metas)
  .map(([path, mod]) => {
    const componentPath = path.replace(/meta\.tsx$/, "component.tsx")
    const source = sources[componentPath]
    const load = loaders[componentPath]
    if (source === undefined || !load) {
      throw new Error(`${path} has no component.tsx next to it`)
    }
    return { meta: mod.default, source, load }
  })
  .sort(
    (a, b) =>
      b.meta.createdAt.localeCompare(a.meta.createdAt) ||
      a.meta.title.localeCompare(b.meta.title)
  )

export function findComponent(slug: string): LibraryEntry | undefined {
  return library.find((entry) => entry.meta.slug === slug)
}
