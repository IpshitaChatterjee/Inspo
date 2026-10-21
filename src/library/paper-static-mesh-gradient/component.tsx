"use client"

// Static mesh gradient, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import {
  StaticMeshGradient,
  type StaticMeshGradientProps,
} from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colors: "#ffad0a,#6200ff,#e2a3ff,#ff99fd",
  positions: 2,
  waveX: 1,
  waveXShift: 0.6,
  waveY: 1,
  waveYShift: 0.21,
  mixing: 0.93,
  grainMixer: 0,
  grainOverlay: 0,
  scale: 1,
  rotation: 270,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type StaticMeshGradientShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function StaticMeshGradientShader(
  props: StaticMeshGradientShaderProps
) {
  const {
    children,
    colors,
    positions,
    waveX,
    waveXShift,
    waveY,
    waveYShift,
    mixing,
    grainMixer,
    grainOverlay,
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
      <StaticMeshGradient
        colors={colors.split(",")}
        positions={positions}
        waveX={waveX}
        waveXShift={waveXShift}
        waveY={waveY}
        waveYShift={waveYShift}
        mixing={mixing}
        grainMixer={grainMixer}
        grainOverlay={grainOverlay}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as StaticMeshGradientProps["fit"]}
        speed={0}
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
