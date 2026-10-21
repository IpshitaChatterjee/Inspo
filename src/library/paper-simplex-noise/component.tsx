"use client"

// Simplex noise, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import {
  SimplexNoise,
  type SimplexNoiseProps,
} from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colors: "#4449CF,#FFD1E0,#F94446,#FFD36B,#FFFFFF",
  stepsPerColor: 2,
  softness: 0,
  speed: 0.5,
  scale: 0.6,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type SimplexNoiseShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function SimplexNoiseShader(props: SimplexNoiseShaderProps) {
  const {
    children,
    colors,
    stepsPerColor,
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
      <SimplexNoise
        colors={colors.split(",")}
        stepsPerColor={stepsPerColor}
        softness={softness}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as SimplexNoiseProps["fit"]}
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
