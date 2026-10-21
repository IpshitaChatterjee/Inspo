"use client"

// Grain gradient, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import {
  GrainGradient,
  type GrainGradientProps,
} from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#000000",
  colors: "#7300ff,#eba8ff,#00bfff,#2a00ff",
  softness: 0.5,
  intensity: 0.5,
  noise: 0.25,
  shape: "corners",
  speed: 1,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type GrainGradientShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function GrainGradientShader(props: GrainGradientShaderProps) {
  const {
    children,
    colorBack,
    colors,
    softness,
    intensity,
    noise,
    shape,
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
      <GrainGradient
        colorBack={colorBack}
        colors={colors.split(",")}
        softness={softness}
        intensity={intensity}
        noise={noise}
        shape={shape as GrainGradientProps["shape"]}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as GrainGradientProps["fit"]}
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
