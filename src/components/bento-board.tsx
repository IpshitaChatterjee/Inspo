import * as React from "react"
import { ImageIcon } from "lucide-react"

import { useGoogleFont } from "@/components/font-match"
import { mediaUrl } from "@/lib/api"
import { fillBoard, layoutOf, type Board, type Cell } from "@/lib/projects"
import type { Item } from "@/lib/api"

type BentoBoardProps = {
  name: string
  /** Everything in the project, links included. */
  count: number
  board: Board
  pictures: Item[]
  colors: string[]
  fonts: { family: string; weight: number }[]
  ref?: React.Ref<HTMLDivElement>
}

function isDark(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b < 140
}

// The moodboard: a fixed bento of the project's pictures plus colour, type
// and title tiles. Text is sized to the board's width (cqw), so it looks the
// same on screen, on a phone and in the exported PNG.
export function BentoBoard({
  name,
  count,
  board,
  pictures,
  colors,
  fonts,
  ref,
}: BentoBoardProps) {
  const layout = layoutOf(board.layout)
  const cells = fillBoard(layout, board, pictures)
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
        gridTemplateAreas: layout.areas.map((row) => `"${row}"`).join(" "),
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gridTemplateRows: "repeat(3, minmax(0, 1fr))",
        gap: board.gap,
        padding: board.gap,
        background: board.background,
        borderRadius: board.radius + board.gap,
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.area}
          className="relative min-h-0 min-w-0 overflow-hidden"
          style={{ gridArea: cell.area, borderRadius: board.radius }}
        >
          <CellContent
            cell={cell}
            name={name}
            count={count}
            colors={colors}
            fonts={fonts}
            tone={tone}
          />
        </div>
      ))}
    </div>
  )
}

type Tone = { surface: string; ink: string; muted: string }

function CellContent({
  cell,
  name,
  count,
  colors,
  fonts,
  tone,
}: {
  cell: Cell
  name: string
  count: number
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
    case "title":
      return (
        <div
          className="flex size-full flex-col justify-end p-[1.6cqw]"
          style={{
            background: tone.ink,
            color: tone.surface === "#ffffff" ? "#fbfaf6" : "#1c1c1a",
          }}
        >
          <span className="font-heading text-[2.4cqw] leading-[1.05] font-semibold tracking-tight [overflow-wrap:anywhere]">
            {name}
          </span>
          <span className="mt-[0.5cqw] text-[1.05cqw] opacity-60">
            {count} {count === 1 ? "reference" : "references"}
          </span>
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
