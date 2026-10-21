"use client"

// Perlin noise, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { PerlinNoise, type PerlinNoiseProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorFront: "#fccff7",
  colorBack: "#632ad5",
  proportion: 0.35,
  softness: 0.1,
  octaveCount: 1,
  persistence: 1,
  lacunarity: 1.5,
  speed: 0.5,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "none",
}
// @inspo-defaults-end

type PerlinNoiseShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function PerlinNoiseShader(props: PerlinNoiseShaderProps) {
  const {
    children,
    colorFront,
    colorBack,
    proportion,
    softness,
    octaveCount,
    persistence,
    lacunarity,
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
      <PerlinNoise
        colorFront={colorFront}
        colorBack={colorBack}
        proportion={proportion}
        softness={softness}
        octaveCount={octaveCount}
        persistence={persistence}
        lacunarity={lacunarity}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as PerlinNoiseProps["fit"]}
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
