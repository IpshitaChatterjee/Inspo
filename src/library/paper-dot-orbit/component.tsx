"use client"

// Dot orbit, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { DotOrbit, type DotOrbitProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#000000",
  colors: "#ffc96b,#ff6200,#ff2f00,#421100,#1a0000",
  size: 1,
  sizeRange: 0,
  spreading: 1,
  stepsPerColor: 4,
  speed: 1.5,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type DotOrbitShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function DotOrbitShader(props: DotOrbitShaderProps) {
  const {
    children,
    colorBack,
    colors,
    size,
    sizeRange,
    spreading,
    stepsPerColor,
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
      <DotOrbit
        colorBack={colorBack}
        colors={colors.split(",")}
        size={size}
        sizeRange={sizeRange}
        spreading={spreading}
        stepsPerColor={stepsPerColor}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as DotOrbitProps["fit"]}
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
