"use client"

// Dithering, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { Dithering, type DitheringProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#000000",
  colorFront: "#00b2ff",
  shape: "sphere",
  type: "4x4",
  size: 2,
  speed: 1,
  scale: 0.6,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type DitheringShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function DitheringShader(props: DitheringShaderProps) {
  const {
    children,
    colorBack,
    colorFront,
    shape,
    type,
    size,
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
      <Dithering
        colorBack={colorBack}
        colorFront={colorFront}
        shape={shape as DitheringProps["shape"]}
        type={type as DitheringProps["type"]}
        size={size}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as DitheringProps["fit"]}
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
