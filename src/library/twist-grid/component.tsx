"use client"

import { useEffect, useRef, useState } from "react"

// A grid of boxes that sit turned edge-on, like open blinds, until the pointer
// comes over them. Then each box turns to face the pointer: boxes in its row
// and column lie flat, boxes on the diagonals stay twisted into thin slivers,
// so the grid draws a starburst that follows the pointer around.
// It fills its parent, so give the parent a size.
// @inspo-defaults-start
const defaults = {
  boxColor: "#c6ff0c",
  backgroundColor: "#144b3d",
  boxSize: 38,
  gap: 1,
  cornerRadius: 0,
  twist: 86,
  restTurn: 84,
  depth: 0.3,
  speed: 14,
}
// @inspo-defaults-end

type TwistGridProps = {
  boxColor?: string
  backgroundColor?: string
  boxSize?: number // px, width and height of each box
  gap?: number // px between boxes
  cornerRadius?: number // px
  twist?: number // degrees, how far the diagonal boxes stay turned on hover
  restTurn?: number // degrees, how far every box is turned when nothing hovers it (0 = flat)
  depth?: number // 0–1, how strong the 3D perspective looks (0 = none)
  speed?: number // how quickly the boxes catch up with the pointer and settle back
}

type Size = { width: number; height: number }

export default function TwistGrid({
  boxColor = defaults.boxColor,
  backgroundColor = defaults.backgroundColor,
  boxSize = defaults.boxSize,
  gap = defaults.gap,
  cornerRadius = defaults.cornerRadius,
  twist = defaults.twist,
  restTurn = defaults.restTurn,
  depth = defaults.depth,
  speed = defaults.speed,
}: TwistGridProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const boxRefs = useRef<(HTMLDivElement | null)[]>([])
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  // Pointer target and the smoothed values the boxes actually follow.
  const motion = useRef({
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    hoverTarget: 0,
    hover: 0,
    raf: 0,
    last: 0,
  })

  // Measure the frame so the grid always covers it.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const measure = () =>
      setSize({ width: frame.clientWidth, height: frame.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const pitch = Math.max(boxSize, 2) + Math.max(gap, 0)
  const cols = size.width ? Math.ceil(size.width / pitch) + 1 : 0
  const rows = size.height ? Math.ceil(size.height / pitch) + 1 : 0
  // Centre the grid so any cut-off boxes are shared evenly between the edges.
  const offsetX = (size.width - (cols * pitch - gap)) / 2
  const offsetY = (size.height - (rows * pitch - gap)) / 2
  const perspective =
    depth > 0 ? `perspective(${(boxSize * 2) / depth}px) ` : ""
  const restTransform = `${perspective}rotateY(${restTurn}deg)`

  useEffect(() => {
    const m = motion.current

    const place = () => {
      const half = boxSize / 2
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const box = boxRefs.current[row * cols + col]
          if (!box) continue
          const dx = offsetX + col * pitch + half - m.x
          const dy = offsetY + row * pitch + half - m.y
          // Turn around the line pointing at the pointer. The amount follows
          // sin(2 × angle): none in the pointer's row and column, most on the
          // diagonals, which is what makes the starburst.
          const angle = Math.atan2(dy, dx)
          const turn = twist * Math.sin(2 * angle) * m.hover
          box.style.transform =
            `${perspective}rotate3d(${Math.cos(angle).toFixed(4)}, ${Math.sin(angle).toFixed(4)}, 0, ${turn.toFixed(2)}deg) ` +
            `rotateY(${(restTurn * (1 - m.hover)).toFixed(2)}deg)`
        }
      }
    }

    const step = (now: number) => {
      const dt = Math.min((now - (m.last || now)) / 1000, 0.05)
      m.last = now
      // Ease out: cover the same share of the remaining distance each moment.
      const k = 1 - Math.exp(-dt * Math.max(speed, 0.1))
      m.x += (m.targetX - m.x) * k
      m.y += (m.targetY - m.y) * k
      m.hover += (m.hoverTarget - m.hover) * k
      place()
      const settled =
        Math.abs(m.targetX - m.x) < 0.1 &&
        Math.abs(m.targetY - m.y) < 0.1 &&
        Math.abs(m.hoverTarget - m.hover) < 0.001
      if (settled) {
        m.x = m.targetX
        m.y = m.targetY
        m.hover = m.hoverTarget
        place()
        m.raf = 0
        m.last = 0
      } else {
        m.raf = requestAnimationFrame(step)
      }
    }

    const wake = () => {
      if (!m.raf) m.raf = requestAnimationFrame(step)
    }

    const frame = frameRef.current
    if (!frame) return
    const pointAt = (event: PointerEvent) => {
      const rect = frame.getBoundingClientRect()
      m.targetX = event.clientX - rect.left
      m.targetY = event.clientY - rect.top
    }
    const onEnter = (event: PointerEvent) => {
      pointAt(event)
      // Coming back from rest, start the starburst right where the pointer is.
      if (m.hover < 0.05) {
        m.x = m.targetX
        m.y = m.targetY
      }
      m.hoverTarget = 1
      wake()
    }
    const onMove = (event: PointerEvent) => {
      pointAt(event)
      m.hoverTarget = 1
      wake()
    }
    const onLeave = () => {
      m.hoverTarget = 0
      wake()
    }

    frame.addEventListener("pointerenter", onEnter)
    frame.addEventListener("pointermove", onMove)
    frame.addEventListener("pointerleave", onLeave)
    place()
    return () => {
      frame.removeEventListener("pointerenter", onEnter)
      frame.removeEventListener("pointermove", onMove)
      frame.removeEventListener("pointerleave", onLeave)
      cancelAnimationFrame(m.raf)
      m.raf = 0
      m.last = 0
    }
  }, [
    rows,
    cols,
    pitch,
    offsetX,
    offsetY,
    boxSize,
    twist,
    restTurn,
    perspective,
    speed,
  ])

  const boxes = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      boxes.push(
        <div
          key={index}
          ref={(el) => {
            boxRefs.current[index] = el
          }}
          style={{
            position: "absolute",
            left: offsetX + col * pitch,
            top: offsetY + row * pitch,
            width: boxSize,
            height: boxSize,
            borderRadius: cornerRadius,
            background: boxColor,
            transform: restTransform,
            backfaceVisibility: "visible",
            willChange: "transform",
          }}
        />
      )
    }
  }

  return (
    <div
      ref={frameRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: backgroundColor,
      }}
    >
      {boxes}
    </div>
  )
}
