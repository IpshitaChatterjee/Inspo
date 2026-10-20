"use client"

import type { CSSProperties, ReactNode } from "react"

// A soft grid of dots over a blurred image or gradient, like a frosted LED
// panel. It fills its parent, so give the parent a size.
// @inspo-defaults-start
const defaults = {
  background:
    "radial-gradient(120% 45% at 50% 0%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%), radial-gradient(28% 16% at 22% 30%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%), radial-gradient(34% 14% at 76% 24%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%), radial-gradient(70% 34% at 28% 100%, rgba(226,192,92,0.9) 0%, rgba(226,192,92,0) 70%), radial-gradient(50% 30% at 88% 96%, rgba(212,178,78,0.75) 0%, rgba(212,178,78,0) 70%), linear-gradient(180deg, #f5f8fb 0%, #c4ddf2 16%, #8fc0ea 36%, #a6cde0 50%, #98c487 64%, #78ab62 80%, #a9ab55 100%)",
  blur: 40,
  dotSize: 2,
  spacing: 9,
  dotColor: "#ffffff",
  dotOpacity: 0.9,
  shape: "square",
  blend: "soft-light",
}
// @inspo-defaults-end

type DottedGlassProps = {
  background?: string // any CSS background: gradients, url("…"), or both
  blur?: number // px
  dotSize?: number // px
  spacing?: number // px between dot centres
  dotColor?: string
  dotOpacity?: number // 0–1
  shape?: "circle" | "square"
  blend?: "soft-light" | "overlay" | "normal"
  children?: ReactNode
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
  children,
}: DottedGlassProps) {
  const radius = dotSize / 2
  const dots =
    shape === "circle"
      ? `radial-gradient(circle, ${dotColor} ${Math.max(radius - 0.25, 0)}px, transparent ${radius + 0.25}px)`
      : // Paints the top-left dotSize × dotSize corner of every tile.
        `conic-gradient(at ${dotSize}px ${dotSize}px, transparent 75%, ${dotColor} 0)`

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
      <div
        style={{
          ...layer,
          inset: 0,
          backgroundImage: dots,
          backgroundSize: `${spacing}px ${spacing}px`,
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
