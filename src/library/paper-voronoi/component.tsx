"use client"

// Voronoi, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { Voronoi, type VoronoiProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colors: "#ff8247,#ffe53d",
  stepsPerColor: 3,
  colorGap: "#2e0000",
  colorGlow: "#ffffff",
  distortion: 0.4,
  gap: 0.04,
  glow: 0,
  speed: 0.5,
  scale: 0.5,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type VoronoiShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function VoronoiShader(props: VoronoiShaderProps) {
  const {
    children,
    colors,
    stepsPerColor,
    colorGap,
    colorGlow,
    distortion,
    gap,
    glow,
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
      <Voronoi
        colors={colors.split(",")}
        stepsPerColor={stepsPerColor}
        colorGap={colorGap}
        colorGlow={colorGlow}
        distortion={distortion}
        gap={gap}
        glow={glow}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as VoronoiProps["fit"]}
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
