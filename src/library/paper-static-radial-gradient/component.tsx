"use client"

// Static radial gradient, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import {
  StaticRadialGradient,
  type StaticRadialGradientProps,
} from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  colorBack: "#000000",
  colors: "#00bbff,#00ffe1,#ffffff",
  radius: 0.8,
  focalDistance: 0.99,
  focalAngle: 0,
  falloff: 0.24,
  mixing: 0.5,
  distortion: 0,
  distortionShift: 0,
  distortionFreq: 12,
  grainMixer: 0,
  grainOverlay: 0,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "contain",
}
// @inspo-defaults-end

type StaticRadialGradientShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function StaticRadialGradientShader(
  props: StaticRadialGradientShaderProps
) {
  const {
    children,
    colorBack,
    colors,
    radius,
    focalDistance,
    focalAngle,
    falloff,
    mixing,
    distortion,
    distortionShift,
    distortionFreq,
    grainMixer,
    grainOverlay,
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
      <StaticRadialGradient
        colorBack={colorBack}
        colors={colors.split(",")}
        radius={radius}
        focalDistance={focalDistance}
        focalAngle={focalAngle}
        falloff={falloff}
        mixing={mixing}
        distortion={distortion}
        distortionShift={distortionShift}
        distortionFreq={distortionFreq}
        grainMixer={grainMixer}
        grainOverlay={grainOverlay}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as StaticRadialGradientProps["fit"]}
        speed={0}
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
