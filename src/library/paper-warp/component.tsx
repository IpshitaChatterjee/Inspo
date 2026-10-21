"use client"

// Warp, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { Warp, type WarpProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colors: "#121212,#9470ff,#121212,#8838ff",
  proportion: 0.45,
  softness: 1,
  shape: "checks",
  shapeScale: 0.1,
  distortion: 0.25,
  swirl: 0.8,
  swirlIterations: 10,
  speed: 1,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type WarpShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function WarpShader(props: WarpShaderProps) {
  const {
    children,
    colors,
    proportion,
    softness,
    shape,
    shapeScale,
    distortion,
    swirl,
    swirlIterations,
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
      <Warp
        colors={colors.split(",")}
        proportion={proportion}
        softness={softness}
        shape={shape as WarpProps["shape"]}
        shapeScale={shapeScale}
        distortion={distortion}
        swirl={swirl}
        swirlIterations={swirlIterations}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as WarpProps["fit"]}
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
