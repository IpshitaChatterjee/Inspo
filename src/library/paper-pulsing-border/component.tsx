"use client"

// Pulsing border, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import {
  PulsingBorder,
  type PulsingBorderProps,
} from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#000000",
  colors: "#0dc1fd,#d915ef,#ff3f2ecc",
  roundness: 0.25,
  thickness: 0.1,
  margin: 0,
  marginLeft: 0,
  marginRight: 0,
  marginTop: 0,
  marginBottom: 0,
  aspectRatio: "auto",
  softness: 0.75,
  intensity: 0.2,
  bloom: 0.25,
  spots: 4,
  spotSize: 0.5,
  pulse: 0.25,
  smoke: 0.3,
  smokeSize: 0.6,
  speed: 1,
  scale: 0.6,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type PulsingBorderShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function PulsingBorderShader(props: PulsingBorderShaderProps) {
  const {
    children,
    colorBack,
    colors,
    roundness,
    thickness,
    margin,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    aspectRatio,
    softness,
    intensity,
    bloom,
    spots,
    spotSize,
    pulse,
    smoke,
    smokeSize,
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
      <PulsingBorder
        colorBack={colorBack}
        colors={colors.split(",")}
        roundness={roundness}
        thickness={thickness}
        margin={margin}
        marginLeft={marginLeft}
        marginRight={marginRight}
        marginTop={marginTop}
        marginBottom={marginBottom}
        aspectRatio={aspectRatio as PulsingBorderProps["aspectRatio"]}
        softness={softness}
        intensity={intensity}
        bloom={bloom}
        spots={spots}
        spotSize={spotSize}
        pulse={pulse}
        smoke={smoke}
        smokeSize={smokeSize}
        speed={speed}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as PulsingBorderProps["fit"]}
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
