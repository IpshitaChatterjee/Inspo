"use client"

// Fluted glass, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@0.0.82
import type { ReactNode } from "react"
import { FlutedGlass, type FlutedGlassProps } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
  image:
    "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22900%22%20viewBox%3D%220%200%201200%20900%22%3E%0A%20%20%20%20%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%20%20%20%20%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f3efe6%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23d9d2c3%22%2F%3E%3C%2FlinearGradient%3E%0A%20%20%20%20%20%20%20%20%20%20%3CradialGradient%20id%3D%22a%22%20cx%3D%2235%25%22%20cy%3D%2230%25%22%20r%3D%2270%25%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23ffffff%22%2F%3E%3Cstop%20offset%3D%220.5%22%20stop-color%3D%22%23e86f4f%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%235b1f15%22%2F%3E%3C%2FradialGradient%3E%0A%20%20%20%20%20%20%20%20%20%20%3CradialGradient%20id%3D%22b%22%20cx%3D%2235%25%22%20cy%3D%2230%25%22%20r%3D%2275%25%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23f6fbff%22%2F%3E%3Cstop%20offset%3D%220.55%22%20stop-color%3D%22%234c7bd9%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23132552%22%2F%3E%3C%2FradialGradient%3E%0A%20%20%20%20%20%20%20%20%20%20%3CradialGradient%20id%3D%22c%22%20cx%3D%2235%25%22%20cy%3D%2230%25%22%20r%3D%2275%25%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23fffbe9%22%2F%3E%3Cstop%20offset%3D%220.55%22%20stop-color%3D%22%23e5b84a%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%235c4210%22%2F%3E%3C%2FradialGradient%3E%0A%20%20%20%20%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%221200%22%20height%3D%22900%22%20fill%3D%22url(%23bg)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M0%20700%20C%20250%20620%2C%20450%20780%2C%20700%20700%20S%201050%20620%2C%201200%20690%20L1200%20900%20L0%20900%20Z%22%20fill%3D%22%232f3a33%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22430%22%20cy%3D%22420%22%20r%3D%22230%22%20fill%3D%22url(%23a)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22800%22%20cy%3D%22360%22%20r%3D%22170%22%20fill%3D%22url(%23b)%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%22700%22%20cy%3D%22620%22%20r%3D%22120%22%20fill%3D%22url(%23c)%22%2F%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E",
  colorBack: "#00000000",
  colorShadow: "#000000",
  colorHighlight: "#ffffff",
  shadows: 0.25,
  size: 0.5,
  angle: 0,
  distortion: 0.5,
  shift: 0,
  blur: 0,
  edges: 0.25,
  margin: 0,
  marginLeft: 0,
  marginRight: 0,
  marginTop: 0,
  marginBottom: 0,
  stretch: 0,
  distortionShape: "prism",
  highlights: 0.1,
  shape: "lines",
  grainMixer: 0,
  grainOverlay: 0,
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  fit: "cover",
}
// @inspo-defaults-end

type FlutedGlassShaderProps = Partial<typeof defaults> & {
  children?: ReactNode
}

export default function FlutedGlassShader(props: FlutedGlassShaderProps) {
  const {
    children,
    image,
    colorBack,
    colorShadow,
    colorHighlight,
    shadows,
    size,
    angle,
    distortion,
    shift,
    blur,
    edges,
    margin,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    stretch,
    distortionShape,
    highlights,
    shape,
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
      <FlutedGlass
        image={image}
        colorBack={colorBack}
        colorShadow={colorShadow}
        colorHighlight={colorHighlight}
        shadows={shadows}
        size={size}
        angle={angle}
        distortion={distortion}
        shift={shift}
        blur={blur}
        edges={edges}
        margin={margin}
        marginLeft={marginLeft}
        marginRight={marginRight}
        marginTop={marginTop}
        marginBottom={marginBottom}
        stretch={stretch}
        distortionShape={distortionShape as FlutedGlassProps["distortionShape"]}
        highlights={highlights}
        shape={shape as FlutedGlassProps["shape"]}
        grainMixer={grainMixer}
        grainOverlay={grainOverlay}
        scale={scale}
        rotation={rotation}
        offsetX={offsetX}
        offsetY={offsetY}
        fit={fit as FlutedGlassProps["fit"]}
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
