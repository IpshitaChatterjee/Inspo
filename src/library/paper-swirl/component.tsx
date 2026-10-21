"use client"

// Swirl, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { Swirl, type SwirlProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#330000",
  colors: "#ffd1d1,#ff8a8a,#660000",
  bandCount: 4,
  twist: 0.1,
  center: 0.2,
  proportion: 0.5,
  softness: 0,
  noiseFrequency: 0.4,
  noise: 0.2,
  speed: 0.32,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type SwirlShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function SwirlShader(props: SwirlShaderProps) {
  const {
    children,
    colorBack,
    colors,
    bandCount,
    twist,
    center,
    proportion,
    softness,
    noiseFrequency,
    noise,
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
      <Swirl
        colorBack={colorBack}
        colors={colors.split(",")}
        bandCount={bandCount}
        twist={twist}
        center={center}
        proportion={proportion}
        softness={softness}
        noiseFrequency={noiseFrequency}
        noise={noise}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as SwirlProps["fit"]}
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
