import * as React from "react"
import { motion } from "motion/react"
import { ImageIcon } from "lucide-react"
import { cn } from "cn"

import { useGoogleFont } from "@/components/font-match"
import { mediaUrl } from "@/lib/api"
import type { Board, Cell } from "@/lib/projects"

type BentoBoardProps = {
  board: Board
  /** The grid areas and what fills them, from fitBoard. */
  areas: string[]
  cells: Cell[]
  colors: string[]
  fonts: { family: string; weight: number }[]
  /** Dragging one tile onto another swaps them; left out, the board is still. */
  onSwap?: (from: string, to: string) => void
  ref?: React.Ref<HTMLDivElement>
}

// Follows a picture or tile around the board, so a swap animates it to its new spot.
const keyOf = (cell: Cell) =>
  cell.kind === "picture"
    ? (cell.item?.id ?? `empty:${cell.area}`)
    : `tile:${cell.kind}`

function isDark(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b < 140
}

// The moodboard: a bento of the project's pictures plus colour and type
// tiles. Text is sized to the board's width (cqw), so it looks the
// same on screen, on a phone and in the exported PNG.
export function BentoBoard({
  board,
  areas,
  cells,
  colors,
  fonts,
  onSwap,
  ref,
}: BentoBoardProps) {
  const spots = React.useRef(new Map<string, HTMLElement>())
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [over, setOver] = React.useState<string | null>(null)
  const canDrag = (cell: Cell) =>
    !!onSwap && (cell.kind !== "picture" || !!cell.item)

  // The tile under the pointer, other than the one being dragged.
  const targetAt = (x: number, y: number, from: string) => {
    for (const [area, el] of spots.current) {
      if (area === from) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const cell = cells.find((c) => c.area === area)
        return cell && canDrag(cell) ? area : null
      }
    }
    return null
  }

  const dark = isDark(board.background)
  const tone = {
    surface: dark ? "rgba(255,255,255,0.08)" : "#ffffff",
    ink: dark ? "#f4f3ee" : "#1c1c1a",
    muted: dark ? "rgba(244,243,238,0.6)" : "#6b6b63",
  }

  return (
    <div
      ref={ref}
      className="[container-type:inline-size] grid aspect-[16/10] w-full overflow-hidden"
      style={{
        gridTemplateAreas: areas.map((row) => `"${row}"`).join(" "),
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gridTemplateRows: "repeat(3, minmax(0, 1fr))",
        gap: board.gap,
        padding: board.gap,
        background: board.background,
        borderRadius: board.radius + board.gap,
      }}
    >
      {cells.map((cell) => (
        <motion.div
          key={keyOf(cell)}
          ref={(el) => {
            if (el) spots.current.set(cell.area, el)
            else spots.current.delete(cell.area)
          }}
          layout
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          drag={canDrag(cell)}
          dragSnapToOrigin
          dragMomentum={false}
          dragElastic={1}
          whileDrag={{
            scale: 1.04,
            zIndex: 10,
            boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
          }}
          onDragStart={() => setDragging(cell.area)}
          onDrag={(e) => {
            const { clientX, clientY } = e as PointerEvent
            setOver(targetAt(clientX, clientY, cell.area))
          }}
          onDragEnd={(e) => {
            const { clientX, clientY } = e as PointerEvent
            const target = targetAt(clientX, clientY, cell.area)
            setDragging(null)
            setOver(null)
            if (target) onSwap?.(cell.area, target)
          }}
          className={cn(
            "relative min-h-0 min-w-0 overflow-hidden",
            canDrag(cell) && "cursor-grab active:cursor-grabbing",
            over === cell.area &&
              "ring-3 ring-primary ring-offset-2 ring-offset-transparent",
            dragging &&
              dragging !== cell.area &&
              over !== cell.area &&
              "opacity-80"
          )}
          style={{ gridArea: cell.area, borderRadius: board.radius }}
        >
          <CellContent cell={cell} colors={colors} fonts={fonts} tone={tone} />
        </motion.div>
      ))}
    </div>
  )
}

type Tone = { surface: string; ink: string; muted: string }

function CellContent({
  cell,
  colors,
  fonts,
  tone,
}: {
  cell: Cell
  colors: string[]
  fonts: { family: string; weight: number }[]
  tone: Tone
}) {
  switch (cell.kind) {
    case "picture":
      return cell.item ? (
        <img
          src={mediaUrl(cell.item, "thumb")}
          alt={cell.item.title ?? ""}
          draggable={false}
          className="size-full object-cover"
        />
      ) : (
        <div
          className="flex size-full items-center justify-center"
          style={{ background: tone.surface, color: tone.muted }}
        >
          <ImageIcon className="size-[2.2cqw] opacity-50" />
        </div>
      )
    case "colors":
      return <ColorsTile colors={colors} tone={tone} />
    case "type":
      return <TypeTile fonts={fonts} tone={tone} />
  }
}

function ColorsTile({ colors, tone }: { colors: string[]; tone: Tone }) {
  const columns = colors.length > 4 ? 4 : Math.max(colors.length, 1)
  return (
    <div
      className="grid size-full gap-[0.5cqw] p-[0.8cqw]"
      style={{
        background: tone.surface,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {colors.map((hex) => (
        <div
          key={hex}
          className="relative flex min-h-0 items-end overflow-hidden rounded-[0.5cqw] p-[0.45cqw]"
          style={{ background: hex }}
        >
          <span
            className="font-mono text-[0.75cqw] leading-none uppercase"
            style={{ color: isDark(hex) ? "#ffffffcc" : "#000000aa" }}
          >
            {hex}
          </span>
        </div>
      ))}
    </div>
  )
}

function TypeTile({
  fonts,
  tone,
}: {
  fonts: { family: string; weight: number }[]
  tone: Tone
}) {
  const [first, second] = fonts
  return (
    <div
      className="flex size-full items-end justify-between gap-[1cqw] p-[1.4cqw]"
      style={{ background: tone.surface, color: tone.ink }}
    >
      {first && <FontSample font={first} big tone={tone} />}
      {second && <FontSample font={second} tone={tone} />}
    </div>
  )
}

function FontSample({
  font,
  big,
  tone,
}: {
  font: { family: string; weight: number }
  big?: boolean
  tone: Tone
}) {
  useGoogleFont(font.family, font.weight)
  const style = { fontFamily: `"${font.family}"`, fontWeight: font.weight }
  return (
    <div className="flex min-w-0 flex-col gap-[0.4cqw]">
      <span
        className={
          big ? "text-[4.6cqw] leading-none" : "text-[2.6cqw] leading-none"
        }
        style={style}
      >
        Aa
      </span>
      <span className="truncate text-[1.2cqw] leading-tight" style={style}>
        {font.family}
      </span>
      <span className="text-[0.8cqw]" style={{ color: tone.muted }}>
        Closest Google Font
      </span>
    </div>
  )
}
