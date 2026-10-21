import * as React from "react"

import { InspoCard, type Selection } from "@/components/inspo-card"
import type { Item } from "@/lib/api"

const GAP = 14
const MIN_COLUMN = 236
const PAGE = 80
// Keeps very tall screenshots from taking over a whole column.
const MAX_RATIO = 2.2
const MIN_RATIO = 0.35

type MasonryGridProps = {
  items: Item[]
  resetKey: string
  fresh: Set<string>
  openId: string | null
  onOpen: (item: Item) => void
  selection?: Selection
}

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

export function MasonryGrid({
  items,
  resetKey,
  fresh,
  openId,
  onOpen,
  selection,
}: MasonryGridProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const sentinel = React.useRef<HTMLDivElement>(null)
  const width = useWidth(ref)
  const [measured, setMeasured] = React.useState<Record<string, number>>({})
  // How many items to render; starts over whenever the filters change.
  const [paging, setPaging] = React.useState({ key: resetKey, limit: PAGE })
  const limit = paging.key === resetKey ? paging.limit : PAGE
  const resetKeyRef = React.useRef(resetKey)
  React.useEffect(() => {
    resetKeyRef.current = resetKey
  }, [resetKey])

  // Render more as you scroll, so thousands of items stay smooth.
  React.useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        const key = resetKeyRef.current
        setPaging((p) => ({
          key,
          limit: (p.key === key ? p.limit : PAGE) + PAGE,
        }))
      },
      { rootMargin: "1600px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
    // Re-observing after each page checks again whether the end is still in view.
  }, [limit, items.length])

  const onRatio = React.useCallback((id: string, ratio: number) => {
    setMeasured((m) =>
      m[id] && Math.abs(m[id] - ratio) < 0.02 ? m : { ...m, [id]: ratio }
    )
  }, [])

  const columnCount = width
    ? Math.max(2, Math.floor((width + GAP) / (MIN_COLUMN + GAP)))
    : 0
  const columnWidth = columnCount
    ? (width - GAP * (columnCount - 1)) / columnCount
    : 0

  const columns = React.useMemo(() => {
    const cols: { item: Item; ratio: number; index: number }[][] = Array.from(
      { length: columnCount },
      () => []
    )
    const heights = new Array(columnCount).fill(0)
    if (!columnCount) return cols
    items.slice(0, limit).forEach((item, index) => {
      const known =
        measured[item.id] ??
        (item.width && item.height ? item.height / item.width : null)
      const ratio = Math.min(
        MAX_RATIO,
        Math.max(
          MIN_RATIO,
          known ??
            (item.kind === "link" ? (item.description ? 0.8 : 0.5) : 1.25)
        )
      )
      // Each item goes into whichever column is currently shortest.
      const shortest = heights.indexOf(Math.min(...heights))
      cols[shortest].push({ item, ratio, index })
      heights[shortest] += columnWidth * ratio + GAP
    })
    return cols
  }, [items, limit, measured, columnCount, columnWidth])

  return (
    <div ref={ref} className="w-full">
      <div className="flex items-start" style={{ gap: GAP }}>
        {columns.map((column, c) => (
          <div
            key={c}
            className="flex min-w-0 flex-1 flex-col"
            style={{ gap: GAP }}
          >
            {column.map(({ item, ratio, index }) => (
              <InspoCard
                key={item.id}
                item={item}
                ratio={ratio}
                fresh={fresh.has(item.id)}
                isOpen={openId === item.id}
                delay={index < PAGE ? Math.min(index, 24) * 0.02 : 0}
                onOpen={onOpen}
                onRatio={onRatio}
                selection={selection}
              />
            ))}
          </div>
        ))}
      </div>
      <div ref={sentinel} aria-hidden className="h-px" />
    </div>
  )
}
