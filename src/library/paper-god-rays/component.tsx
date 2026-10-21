"use client"

// God rays, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { GodRays, type GodRaysProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#000000",
  colorBloom: "#0000ff",
  colors: "#a600ff6e,#6200fff0,#ffffff,#33fff5",
  spotty: 0.3,
  midSize: 0.2,
  midIntensity: 0.4,
  density: 0.3,
  intensity: 0.8,
  bloom: 0.4,
  speed: 0.75,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: -0.55,
  fit: "contain",
}
// @inspo-defaults-end

type GodRaysShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function GodRaysShader(props: GodRaysShaderProps) {
  const {
    children,
    colorBack,
    colorBloom,
    colors,
    spotty,
    midSize,
    midIntensity,
    density,
    intensity,
    bloom,
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
      <GodRays
        colorBack={colorBack}
        colorBloom={colorBloom}
        colors={colors.split(",")}
        spotty={spotty}
        midSize={midSize}
        midIntensity={midIntensity}
        density={density}
        intensity={intensity}
        bloom={bloom}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as GodRaysProps["fit"]}
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
