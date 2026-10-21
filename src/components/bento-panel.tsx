import * as React from "react"
import { DownloadIcon, EyeOffIcon, ShuffleIcon } from "lucide-react"
import { cn } from "cn"

import { ComponentControls } from "@/components/component-controls"
import { Button } from "@/components/ui/button"
import { mediaUrl, type Item } from "@/lib/api"
import {
  areasOf,
  BOARD_DEFAULTS,
  LAYOUTS,
  tilesOf,
  type Board,
  type Layout,
} from "@/lib/projects"
import type { Control, ControlValue } from "@/library/types"

const COLOR_TILE: Control[] = [
  { key: "colors", label: "Colour tile", type: "toggle", default: true },
]
const TYPE_TILE: Control[] = [
  { key: "type", label: "Type tile", type: "toggle", default: true },
]
const STYLE_CONTROLS: Control[] = [
  {
    key: "gap",
    label: "Gap",
    type: "slider",
    min: 0,
    max: 32,
    step: 1,
    default: BOARD_DEFAULTS.gap,
    unit: "px",
  },
  {
    key: "radius",
    label: "Corner radius",
    type: "slider",
    min: 0,
    max: 40,
    step: 1,
    default: BOARD_DEFAULTS.radius,
    unit: "px",
  },
  {
    key: "background",
    label: "Background",
    type: "color",
    default: BOARD_DEFAULTS.background,
  },
]

type BentoPanelProps = {
  board: Board
  pictures: Item[]
  /** How many picture spots the current layout has left after its tiles. */
  spots: number
  /** What the tiles would show; a tile with nothing to show says so. */
  missing: { colors: boolean; type: boolean }
  readOnly: boolean
  exporting: boolean
  onChange: (patch: Partial<Board>) => void
  onShuffle: () => void
  onShuffleColors: () => void
  onExport: () => void
}

export function BentoPanel({
  board,
  pictures,
  spots,
  missing,
  readOnly,
  exporting,
  onChange,
  onShuffle,
  onShuffleColors,
  onExport,
}: BentoPanelProps) {
  const set = (key: string, value: ControlValue) => onChange({ [key]: value })
  const exportButton = (
    <Button
      variant={readOnly ? "default" : "outline"}
      className="flex-1 rounded-full"
      disabled={exporting}
      onClick={onExport}
    >
      <DownloadIcon />
      {exporting ? "Exporting…" : "Export PNG"}
    </Button>
  )
  if (readOnly) return <div className="flex">{exportButton}</div>

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <span className="text-sm">Layout</span>
        <div className="grid grid-cols-4 gap-2">
          {LAYOUTS.map((layout) => (
            <LayoutOption
              key={layout.id}
              layout={layout}
              board={board}
              selected={board.layout === layout.id}
              onSelect={() => onChange({ layout: layout.id })}
            />
          ))}
        </div>
      </section>

      <PictureStrip
        board={board}
        pictures={pictures}
        spots={spots}
        onChange={onChange}
      />

      <section className="flex flex-col gap-3">
        <ComponentControls
          controls={COLOR_TILE}
          values={{ colors: board.colors }}
          onChange={set}
        />
        {board.colors &&
          (missing.colors ? (
            <p className="-mt-1 text-xs text-muted-foreground">
              No colours found in the pictures on the board yet.
            </p>
          ) : (
            <div className="-mt-1 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={onShuffleColors}
              >
                <ShuffleIcon />
                Shuffle colours
              </Button>
              {board.colorSeed !== 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-muted-foreground"
                  onClick={() => onChange({ colorSeed: 0 })}
                >
                  Main colours
                </Button>
              )}
            </div>
          ))}
        <ComponentControls
          controls={TYPE_TILE}
          values={{ type: board.type }}
          onChange={set}
        />
        {board.type && missing.type && (
          <p className="-mt-1 text-xs text-muted-foreground">
            No type found in the pictures on the board yet.
          </p>
        )}
      </section>

      <ComponentControls
        controls={STYLE_CONTROLS}
        values={{
          gap: board.gap,
          radius: board.radius,
          background: board.background,
        }}
        onChange={set}
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-full"
          onClick={onShuffle}
        >
          <ShuffleIcon />
          Shuffle pictures
        </Button>
        {exportButton}
      </div>
    </div>
  )
}

// A small drawing of the layout: tiles in the accent colour, pictures grey.
function LayoutOption({
  layout,
  board,
  selected,
  onSelect,
}: {
  layout: Layout
  board: Board
  selected: boolean
  onSelect: () => void
}) {
  const tileAreas = new Set(
    Object.entries(tilesOf(layout, board))
      .filter(([tile]) => board[tile as keyof typeof layout.tiles])
      .map(([, area]) => area)
  )
  return (
    <button
      type="button"
      aria-label={layout.name}
      aria-pressed={selected}
      title={layout.name}
      onClick={onSelect}
      className={cn(
        "grid aspect-[16/10] gap-0.5 rounded-md p-1 ring-1 transition-shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "ring-2 ring-primary"
          : "ring-border hover:ring-foreground/30"
      )}
      style={{
        gridTemplateAreas: layout.areas.map((row) => `"${row}"`).join(" "),
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gridTemplateRows: "repeat(3, minmax(0, 1fr))",
      }}
    >
      {areasOf(layout).map((area) => (
        <span
          key={area}
          className={cn(
            "rounded-[2px]",
            tileAreas.has(area) ? "bg-primary/60" : "bg-muted-foreground/25"
          )}
          style={{ gridArea: area }}
        />
      ))}
    </button>
  )
}

// Every picture in the project, in board order. Drag to reorder; click to
// leave one off the board (or bring it back). Numbers show which spot each fills.
function PictureStrip({
  board,
  pictures,
  spots,
  onChange,
}: {
  board: Board
  pictures: Item[]
  spots: number
  onChange: (patch: Partial<Board>) => void
}) {
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [over, setOver] = React.useState<string | null>(null)

  let spot = 0
  const placed = new Map<string, number>()
  for (const item of pictures) {
    if (board.hidden.includes(item.id)) continue
    if (spot < spots) placed.set(item.id, ++spot)
  }

  const move = (id: string, before: string) => {
    if (id === before) return
    const ids = pictures.map((item) => item.id).filter((i) => i !== id)
    ids.splice(ids.indexOf(before), 0, id)
    onChange({ order: ids })
  }

  const toggle = (id: string) =>
    onChange({
      hidden: board.hidden.includes(id)
        ? board.hidden.filter((i) => i !== id)
        : [...board.hidden, id],
    })

  if (!pictures.length) return null

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm">Pictures</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {placed.size} of {pictures.length} on the board
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {pictures.map((item) => {
          const hidden = board.hidden.includes(item.id)
          const number = placed.get(item.id)
          return (
            <button
              key={item.id}
              type="button"
              draggable
              title={hidden ? "Show on the board" : "Leave off the board"}
              aria-label={`${item.title ?? item.name}: ${hidden ? "show on the board" : "leave off the board"}`}
              aria-pressed={!hidden}
              onClick={() => toggle(item.id)}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move"
                setDragging(item.id)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(item.id)
              }}
              onDragLeave={() => setOver((o) => (o === item.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging) move(dragging, item.id)
                setDragging(null)
                setOver(null)
              }}
              onDragEnd={() => {
                setDragging(null)
                setOver(null)
              }}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                dragging === item.id && "opacity-40",
                over === item.id &&
                  dragging !== item.id &&
                  "ring-2 ring-primary"
              )}
            >
              <img
                src={mediaUrl(item, "thumb")}
                alt=""
                draggable={false}
                className={cn(
                  "size-full object-cover transition-opacity",
                  (hidden || !number) && "opacity-35",
                  hidden && "grayscale"
                )}
              />
              {hidden ? (
                <EyeOffIcon className="absolute inset-0 m-auto size-4 text-foreground" />
              ) : (
                number && (
                  <span className="absolute top-0.5 left-0.5 flex size-4 items-center justify-center rounded-full bg-background/90 text-[10px] font-medium tabular-nums">
                    {number}
                  </span>
                )
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Drag on the board to swap things around. Click one here to leave it off.
      </p>
    </section>
  )
}
