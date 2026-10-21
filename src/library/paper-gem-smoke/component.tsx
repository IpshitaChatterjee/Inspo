"use client"

// Gem smoke, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { GemSmoke, type GemSmokeProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colors: "#333333,#e7e6df",
  colorBack: "#f0efea",
  image:
    "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22800%22%20viewBox%3D%220%200%20800%20800%22%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%23000%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22230%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22570%22%20cy%3D%22400%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22570%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22230%22%20cy%3D%22400%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22400%22%20r%3D%22120%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  innerDistortion: 0.8,
  outerDistortion: 0.6,
  outerGlow: 0.55,
  innerGlow: 1,
  colorInner: "#fafaf5",
  offset: 0,
  angle: 0,
  size: 0.8,
  shape: "diamond",
  speed: 1,
  scale: 0.6,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type GemSmokeShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function GemSmokeShader(props: GemSmokeShaderProps) {
  const {
    children,
    colors,
    colorBack,
    image,
    innerDistortion,
    outerDistortion,
    outerGlow,
    innerGlow,
    colorInner,
    offset,
    angle,
    size,
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
      <GemSmoke
        colors={colors.split(",")}
        colorBack={colorBack}
        image={image}
        innerDistortion={innerDistortion}
        outerDistortion={outerDistortion}
        outerGlow={outerGlow}
        innerGlow={innerGlow}
        colorInner={colorInner}
        offset={offset}
        angle={angle}
        size={size}
        shape={shape as GemSmokeProps["shape"]}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as GemSmokeProps["fit"]}
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
