"use client"

// Dot grid, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { DotGrid, type DotGridProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#000000",
  colorFill: "#ffffff",
  colorStroke: "#ffaa00",
  size: 2,
  gapX: 32,
  gapY: 32,
  strokeWidth: 0,
  sizeRange: 0,
  opacityRange: 0,
  shape: "circle",
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type DotGridShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function DotGridShader(props: DotGridShaderProps) {
  const {
    children,
    colorBack,
    colorFill,
    colorStroke,
    size,
    gapX,
    gapY,
    strokeWidth,
    sizeRange,
    opacityRange,
    shape,
    scale,
    rotation,
    offsetX,
    offsetY,
    fit,
  } = { ...defaults, ...props }
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <DotGrid
        colorBack={colorBack}
        colorFill={colorFill}
        colorStroke={colorStroke}
        size={size}
        gapX={gapX}
        gapY={gapY}
        strokeWidth={strokeWidth}
        sizeRange={sizeRange}
        opacityRange={opacityRange}
        shape={shape as DotGridProps["shape"]}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as DotGridProps["fit"]}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {children && (
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
      )}
    </div>
  )
}
