"use client"

// Heatmap, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { Heatmap, type HeatmapProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  image:
    "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22800%22%20viewBox%3D%220%200%20800%20800%22%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%23000%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22230%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22570%22%20cy%3D%22400%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22570%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22230%22%20cy%3D%22400%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22400%22%20r%3D%22120%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  contour: 0.5,
  angle: 0,
  noise: 0,
  innerGlow: 0.5,
  outerGlow: 0.5,
  colorBack: "#000000",
  colors: "#11206a,#1f3ba2,#2f63e7,#6bd7ff,#ffe679,#ff991e,#ff4c00",
  speed: 1,
  scale: 0.75,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type HeatmapShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function HeatmapShader(props: HeatmapShaderProps) {
  const {
    children,
    image,
    contour,
    angle,
    noise,
    innerGlow,
    outerGlow,
    colorBack,
    colors,
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
      <Heatmap
        image={image}
        contour={contour}
        angle={angle}
        noise={noise}
        innerGlow={innerGlow}
        outerGlow={outerGlow}
        colorBack={colorBack}
        colors={colors.split(",")}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as HeatmapProps["fit"]}
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
