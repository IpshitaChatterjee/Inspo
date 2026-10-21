"use client"

// Mesh gradient, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import {
  MeshGradient,
  type MeshGradientProps,
} from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colors: "#e0eaff,#241d9a,#f75092,#9f50d3",
  distortion: 0.8,
  swirl: 0.1,
  grainMixer: 0,
  grainOverlay: 0,
  speed: 1,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type MeshGradientShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function MeshGradientShader(props: MeshGradientShaderProps) {
  const {
    children,
    colors,
    distortion,
    swirl,
    grainMixer,
    grainOverlay,
    speed,
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
      <MeshGradient
        colors={colors.split(",")}
        distortion={distortion}
        swirl={swirl}
        grainMixer={grainMixer}
        grainOverlay={grainOverlay}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as MeshGradientProps["fit"]}
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
