"use client"

// Liquid metal, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { LiquidMetal, type LiquidMetalProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#AAAAAC",
  colorTint: "#ffffff",
  image:
    "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22800%22%20viewBox%3D%220%200%20800%20800%22%3E%0A%20%20%20%20%20%20%20%20%3Cg%20fill%3D%22%23000%22%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22230%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22570%22%20cy%3D%22400%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22570%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22230%22%20cy%3D%22400%22%20r%3D%22150%22%2F%3E%0A%20%20%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22400%22%20cy%3D%22400%22%20r%3D%22120%22%2F%3E%0A%20%20%20%20%20%20%20%20%3C%2Fg%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  repetition: 2,
  shiftRed: 0.3,
  shiftBlue: 0.3,
  contour: 0.4,
  softness: 0.1,
  distortion: 0.07,
  angle: 70,
  shape: "diamond",
  speed: 1,
  scale: 0.6,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type LiquidMetalShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function LiquidMetalShader(props: LiquidMetalShaderProps) {
  const {
    children,
    colorBack,
    colorTint,
    image,
    repetition,
    shiftRed,
    shiftBlue,
    contour,
    softness,
    distortion,
    angle,
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
      <LiquidMetal
        colorBack={colorBack}
        colorTint={colorTint}
        image={image}
        repetition={repetition}
        shiftRed={shiftRed}
        shiftBlue={shiftBlue}
        contour={contour}
        softness={softness}
        distortion={distortion}
        angle={angle}
        shape={shape as LiquidMetalProps["shape"]}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as LiquidMetalProps["fit"]}
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
