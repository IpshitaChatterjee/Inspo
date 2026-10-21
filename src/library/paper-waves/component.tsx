"use client"

// Waves, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { Waves, type WavesProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorFront: "#ffbb00",
  colorBack: "#000000",
  rotation: 0,
  shape: 0,
  frequency: 0.5,
  amplitude: 0.5,
  spacing: 1.2,
  proportion: 0.1,
  softness: 0,
  scale: 0.6,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type WavesShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function WavesShader(props: WavesShaderProps) {
  const {
    children,
    colorFront,
    colorBack,
    rotation,
    shape,
    frequency,
    amplitude,
    spacing,
    proportion,
    softness,
    scale,
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
      <Waves
        colorFront={colorFront}
        colorBack={colorBack}
        rotation={rotation}
        shape={shape}
        frequency={frequency}
        amplitude={amplitude}
        spacing={spacing}
        proportion={proportion}
        softness={softness}
        scale={scale}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as WavesProps["fit"]}
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
