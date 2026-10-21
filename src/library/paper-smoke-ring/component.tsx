"use client"

// Smoke ring, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { SmokeRing, type SmokeRingProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#000000",
  colors: "#ffffff",
  noiseScale: 3,
  thickness: 0.65,
  radius: 0.25,
  innerShape: 0.7,
  noiseIterations: 8,
  speed: 0.5,
  scale: 0.8,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type SmokeRingShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function SmokeRingShader(props: SmokeRingShaderProps) {
  const {
    children,
    colorBack,
    colors,
    noiseScale,
    thickness,
    radius,
    innerShape,
    noiseIterations,
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
      <SmokeRing
        colorBack={colorBack}
        colors={colors.split(",")}
        noiseScale={noiseScale}
        thickness={thickness}
        radius={radius}
        innerShape={innerShape}
        noiseIterations={noiseIterations}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as SmokeRingProps["fit"]}
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
