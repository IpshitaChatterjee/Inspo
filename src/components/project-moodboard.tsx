import * as React from "react"
import { toast } from "sonner"

import { BentoBoard } from "@/components/bento-board"
import { BentoPanel } from "@/components/bento-panel"
import type { Item } from "@/lib/api"
import { exportBoard } from "@/lib/export-board"
import {
  boardColors,
  boardFonts,
  boardOf,
  boardPictures,
  fillBoard,
  layoutOf,
  type Board,
  type Project,
} from "@/lib/projects"

type ProjectMoodboardProps = {
  project: Project
  items: Item[]
  readOnly: boolean
  onBoard: (board: Board) => void
}

/** The project's bento, with its controls on the right (below on phones). */
export function ProjectMoodboard({
  project,
  items,
  readOnly,
  onBoard,
}: ProjectMoodboardProps) {
  const boardRef = React.useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = React.useState(false)
  const board = boardOf(project)
  const pictures = boardPictures(project, board, items)
  const colors = boardColors(pictures)
  const fonts = boardFonts(pictures)

  // A tile with nothing to show steps aside for a picture.
  const shown: Board = {
    ...board,
    colors: board.colors && colors.length > 0,
    type: board.type && fonts.length > 0,
  }
  const spots = fillBoard(layoutOf(shown.layout), shown, []).filter(
    (cell) => cell.kind === "picture"
  ).length

  const change = (patch: Partial<Board>) => onBoard({ ...board, ...patch })

  const shuffle = () => {
    const ids = pictures.map((item) => item.id)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    change({ order: ids })
  }

  const exportPng = async () => {
    if (!boardRef.current) return
    setExporting(true)
    try {
      await exportBoard(boardRef.current, project.name, fonts)
    } catch {
      toast.error("Couldn't export the moodboard. Try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 lg:sticky lg:top-20">
        <BentoBoard
          ref={boardRef}
          name={project.name}
          count={project.items.length}
          board={shown}
          pictures={pictures}
          colors={colors}
          fonts={fonts}
        />
        {!pictures.length && (
          <p className="mt-3 text-sm text-muted-foreground">
            Add images or videos to this project to fill the board.
          </p>
        )}
      </div>
      <aside className="w-full shrink-0 lg:w-72">
        <BentoPanel
          board={board}
          pictures={pictures}
          spots={spots}
          missing={{
            colors: board.colors && !colors.length,
            type: board.type && !fonts.length,
          }}
          readOnly={readOnly}
          exporting={exporting}
          onChange={change}
          onShuffle={shuffle}
          onExport={() => void exportPng()}
        />
      </aside>
    </div>
  )
}
