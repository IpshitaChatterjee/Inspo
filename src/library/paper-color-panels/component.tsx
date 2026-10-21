"use client"

// Panels colour, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { ColorPanels, type ColorPanelsProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colors: "#ff9d00,#fd4f30,#809bff,#6d2eff,#333aff,#f15cff,#ffd557",
  colorBack: "#000000",
  angle1: 0,
  angle2: 0,
  length: 1.1,
  edges: false,
  blur: 0,
  fadeIn: 1,
  fadeOut: 0.3,
  density: 3,
  gradient: 0,
  speed: 0.5,
  scale: 0.8,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type ColorPanelsShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function ColorPanelsShader(props: ColorPanelsShaderProps) {
  const {
    children,
    colors,
    colorBack,
    angle1,
    angle2,
    length,
    edges,
    blur,
    fadeIn,
    fadeOut,
    density,
    gradient,
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
      <ColorPanels
        colors={colors.split(",")}
        colorBack={colorBack}
        angle1={angle1}
        angle2={angle2}
        length={length}
        edges={edges}
        blur={blur}
        fadeIn={fadeIn}
        fadeOut={fadeOut}
        density={density}
        gradient={gradient}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as ColorPanelsProps["fit"]}
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
