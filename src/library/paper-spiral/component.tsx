"use client"

// Spiral, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { Spiral, type SpiralProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#001429",
  colorFront: "#79D1FF",
  density: 1,
  distortion: 0,
  strokeWidth: 0.5,
  strokeTaper: 0,
  strokeCap: 0,
  noise: 0,
  noiseFrequency: 0,
  softness: 0,
  speed: 1,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type SpiralShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function SpiralShader(props: SpiralShaderProps) {
  const {
    children,
    colorBack,
    colorFront,
    density,
    distortion,
    strokeWidth,
    strokeTaper,
    strokeCap,
    noise,
    noiseFrequency,
    softness,
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
      <Spiral
        colorBack={colorBack}
        colorFront={colorFront}
        density={density}
        distortion={distortion}
        strokeWidth={strokeWidth}
        strokeTaper={strokeTaper}
        strokeCap={strokeCap}
        noise={noise}
        noiseFrequency={noiseFrequency}
        softness={softness}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as SpiralProps["fit"]}
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
