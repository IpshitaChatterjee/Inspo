"use client"

import { useEffect, useRef } from "react"
import type { CSSProperties, ReactNode } from "react"

// A soft grid of dots over a blurred image or gradient, like a frosted LED
// panel. Dots grow and shrink in soft patches and fade out towards the edges.
// It fills its parent, so give the parent a size.
// @inspo-defaults-start
const defaults = {
  background:
    "radial-gradient(120% 45% at 50% 0%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%), radial-gradient(28% 16% at 22% 30%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%), radial-gradient(34% 14% at 76% 24%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%), radial-gradient(70% 34% at 28% 100%, rgba(226,192,92,0.9) 0%, rgba(226,192,92,0) 70%), radial-gradient(50% 30% at 88% 96%, rgba(212,178,78,0.75) 0%, rgba(212,178,78,0) 70%), linear-gradient(180deg, #f5f8fb 0%, #c4ddf2 16%, #8fc0ea 36%, #a6cde0 50%, #98c487 64%, #78ab62 80%, #a9ab55 100%)",
  blur: 40,
  dotSize: 3,
  spacing: 9,
  dotColor: "#ffffff",
  dotOpacity: 0.9,
  shape: "square",
  blend: "soft-light",
  sizeVariation: 0.7,
  patchSize: 140,
  edgeFade: 0.3,
  fadeFrom: "top",
}
// @inspo-defaults-end

type FadeFrom = "edges" | "top" | "bottom" | "top-bottom" | "none"

type DottedGlassProps = {
  background?: string // any CSS background: gradients, url("…"), or both
  blur?: number // px
  dotSize?: number // px, the largest a dot gets
  spacing?: number // px between dot centres
  dotColor?: string
  dotOpacity?: number // 0–1
  shape?: "circle" | "square"
  blend?: "soft-light" | "overlay" | "normal"
  sizeVariation?: number // 0 = every dot the same size, 1 = some shrink away entirely
  patchSize?: number // px, how large the patches of bigger and smaller dots are
  edgeFade?: number // 0–1, how far in from the edge the dots fade out
  fadeFrom?: FadeFrom
  children?: ReactNode
}

// Smooth random values between 0 and 1 that drift gently across the plane.
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function smoothNoise(x: number, y: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const top = hash(x0, y0) * (1 - ux) + hash(x0 + 1, y0) * ux
  const bottom = hash(x0, y0 + 1) * (1 - ux) + hash(x0 + 1, y0 + 1) * ux
  return top * (1 - uy) + bottom * uy
}

// 1 well inside the frame, easing to 0 at the edges the fade comes from.
function fadeAt(
  x: number,
  y: number,
  w: number,
  h: number,
  amount: number,
  from: FadeFrom
) {
  if (from === "none" || amount <= 0) return 1
  const reach = (span: number) => Math.max(amount * span, 1)
  let t: number
  if (from === "top") t = y / reach(h)
  else if (from === "bottom") t = (h - y) / reach(h)
  else if (from === "top-bottom") t = Math.min(y, h - y) / reach(h / 2)
  else
    t = Math.min(
      x / reach(w / 2),
      (w - x) / reach(w / 2),
      y / reach(h / 2),
      (h - y) / reach(h / 2)
    )
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

export default function DottedGlass({
  background = defaults.background,
  blur = defaults.blur,
  dotSize = defaults.dotSize,
  spacing = defaults.spacing,
  dotColor = defaults.dotColor,
  dotOpacity = defaults.dotOpacity,
  shape = defaults.shape as DottedGlassProps["shape"],
  blend = defaults.blend as DottedGlassProps["blend"],
  sizeVariation = defaults.sizeVariation,
  patchSize = defaults.patchSize,
  edgeFade = defaults.edgeFade,
  fadeFrom = defaults.fadeFrom as FadeFrom,
  children,
}: DottedGlassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // The dots are drawn on a canvas so each one can have its own size.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = dotColor
      const step = Math.max(spacing, 1)
      const patch = Math.max(patchSize, 1)
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          // Two layers of drifting noise read as soft, uneven patches.
          const n =
            0.65 * smoothNoise(x / patch, y / patch) +
            0.35 * smoothNoise(x / (patch / 2.5) + 17, y / (patch / 2.5) + 31)
          const fade = fadeAt(x, y, w, h, edgeFade, fadeFrom)
          const size = dotSize * (1 - sizeVariation + sizeVariation * n) * fade
          if (size < 0.15) continue
          ctx.globalAlpha = fade
          if (shape === "circle") {
            ctx.beginPath()
            ctx.arc(x, y, size / 2, 0, Math.PI * 2)
            ctx.fill()
          } else {
            ctx.fillRect(x - size / 2, y - size / 2, size, size)
          }
        }
      }
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [
    dotSize,
    spacing,
    dotColor,
    shape,
    sizeVariation,
    patchSize,
    edgeFade,
    fadeFrom,
  ])

  const layer: CSSProperties = { position: "absolute", pointerEvents: "none" }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        isolation: "isolate", // dots blend with the background only
      }}
    >
      <div
        // React would drop the size and position below when only the
        // background shorthand changes, so swap in a fresh layer instead.
        key={background}
        style={{
          ...layer,
          // Oversized so the blur's soft edges fall outside the frame.
          inset: -2 * blur,
          background,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: `blur(${blur}px)`,
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          ...layer,
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: dotOpacity,
          mixBlendMode: blend,
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  )
}
