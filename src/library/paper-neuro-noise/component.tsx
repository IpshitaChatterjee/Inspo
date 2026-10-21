"use client"

// Neuro noise, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { NeuroNoise, type NeuroNoiseProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorFront: "#ffffff",
  colorMid: "#47a6ff",
  colorBack: "#000000",
  brightness: 0.05,
  contrast: 0.3,
  speed: 1,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type NeuroNoiseShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function NeuroNoiseShader(props: NeuroNoiseShaderProps) {
  const {
    children,
    colorFront,
    colorMid,
    colorBack,
    brightness,
    contrast,
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
      <NeuroNoise
        colorFront={colorFront}
        colorMid={colorMid}
        colorBack={colorBack}
        brightness={brightness}
        contrast={contrast}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as NeuroNoiseProps["fit"]}
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
