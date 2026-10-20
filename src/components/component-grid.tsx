import { ComponentCard } from "@/components/component-card"
import type { LibraryEntry } from "@/library"

type ComponentGridProps = {
  entries: LibraryEntry[]
  onOpen: (entry: LibraryEntry) => void
}

export function ComponentGrid({ entries, onOpen }: ComponentGridProps) {
  return (
    <div className="grid grid-cols-2 gap-[14px] min-[1400px]:grid-cols-4 lg:grid-cols-3">
      {entries.map((entry, i) => (
        <ComponentCard
          key={entry.meta.slug}
          entry={entry}
          delay={(i % 8) * 0.03}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}
