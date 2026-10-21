// Turns every Paper Shaders shader into an Inspo component (src/library/paper-<name>/).
// Controls, ranges and descriptions come from the documentation comments in
// Paper's own type files; defaults and presets from Paper's presets.
// Re-run after upgrading @paper-design/shaders-react:
//   node scripts/generate-paper-components.ts && npx prettier --write "src/library/paper-*"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const require = createRequire(path.join(ROOT, "package.json"))
const paper = require("@paper-design/shaders-react") as Record<string, unknown>
const TYPES = path.join(ROOT, "node_modules/@paper-design/shaders/dist/shaders")
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
const VERSION: string = pkg.dependencies["@paper-design/shaders-react"]
const CREATED = "2026-10-21"

// Grouped as on shaders.paper.design.
const IMAGE_FILTERS = [
  "paper-texture",
  "fluted-glass",
  "water",
  "image-dithering",
  "halftone-dots",
  "halftone-cmyk",
  "lens-distortion",
]
const LOGO_ANIMATIONS = ["heatmap", "liquid-metal", "gem-smoke"]
// Settings that only matter inside Paper's own editor.
const SKIPPED = new Set([
  "worldWidth",
  "worldHeight",
  "originX",
  "originY",
  "frame",
])
const SIZING = ["scale", "rotation", "offsetX", "offsetY", "fit"]

type Preset = { name: string; params: Record<string, unknown> }
type Control = Record<string, unknown> & {
  key: string
  label: string
  type: string
  default: unknown
}

const pascal = (name: string) =>
  name.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())
const camel = (name: string) =>
  name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

function label(key: string) {
  const colour = key.match(/^color(\w*)$/)
  if (colour) {
    const part = colour[1]
    if (!part) return "Colour"
    if (part === "s") return "Colours"
    const named: Record<string, string> = {
      Back: "Background",
      Front: "Foreground",
    }
    return `${named[part] ?? part.replace(/([A-Z])/g, " $1").trim()} colour`
  }
  const words = key.replace(/([A-Z])/g, " $1").toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// "- u_size (float): Grid size relative to the image box (0 to 1)"
function readDocs(text: string) {
  const docs = new Map<string, { about: string; min?: number; max?: number }>()
  for (const [, name, about] of text.matchAll(
    /^ \* - u_(\w+) \([^)]*\): (.*)$/gm
  )) {
    const range = about.match(/\((-?[\d.]+) to (-?[\d.]+)\)\s*$/)
    docs.set(name, {
      about: about
        .replace(/\s*\((-?[\d.]+) to (-?[\d.]+)\)\s*$/, "")
        .replace(/\s*\([^)]*=[^)]*\)\s*$/, ""),
      min: range ? Number(range[1]) : undefined,
      max: range ? Number(range[2]) : undefined,
    })
  }
  const summary = text.match(/\/\*\*\s*\n \* (.*)\n/)?.[1] ?? ""
  return { docs, summary }
}

// Choice options, e.g. `export declare const HalftoneDotsTypes: { readonly classic: 0; … }`.
function readEnums(text: string) {
  const consts = new Map<string, string[]>()
  for (const [, name, body] of text.matchAll(
    /export declare const (\w+): \{([^}]*)\}/g
  )) {
    consts.set(
      name,
      // Keys may be quoted ('2x2') and needn't be readonly.
      [...body.matchAll(/(?:readonly\s+)?['"]?([\w-]+)['"]?\s*:/g)].map(
        (m) => m[1]
      )
    )
  }
  const types = new Map<string, string[]>()
  for (const [, type, constName] of text.matchAll(
    /export type (\w+) = keyof typeof (\w+);/g
  )) {
    if (consts.has(constName)) types.set(type, consts.get(constName)!)
  }
  return types
}

function readParams(text: string, name: string) {
  const body =
    text.match(
      new RegExp(`export interface ${name}Params[^{]*\\{([^}]*)\\}`)
    )?.[1] ?? ""
  return [...body.matchAll(/^\s*(\w+)\??: ([^;]+);/gm)].map((m) => ({
    key: m[1],
    type: m[2].trim(),
  }))
}

function stepFor(min: number, max: number, values: number[]) {
  const span = max - min
  const candidates =
    span >= 10
      ? [1, 0.5, 0.1, 0.01, 0.001]
      : span > 2
        ? [0.05, 0.01, 0.001]
        : [0.01, 0.001, 0.0001]
  return (
    candidates.find((step) =>
      values.every(
        (v) => Math.abs((v - min) / step - Math.round((v - min) / step)) < 1e-9
      )
    ) ?? 0.0001
  )
}

const round = (n: number) => Number(n.toFixed(6))

function generate(file: string) {
  const name = file.replace(/\.d\.ts$/, "")
  const Component = pascal(name)
  const presets = paper[`${camel(name)}Presets`] as Preset[] | undefined
  if (!presets?.length || paper[Component] === undefined)
    throw new Error(`No component or presets for ${name}`)
  const meta = paper[`${camel(name)}Meta`] as
    { maxColorCount?: number } | undefined
  const text = fs.readFileSync(path.join(TYPES, file), "utf8")
  const { docs, summary } = readDocs(text)
  const enums = readEnums(text)
  const base = presets[0].params
  const isFilter = IMAGE_FILTERS.includes(name)
  const isLogo = LOGO_ANIMATIONS.includes(name)
  // Some shaders have no animation at all; others are still in every preset.
  const animated = new RegExp(
    `interface ${Component}Params extends [^{]*ShaderMotionParams`
  ).test(text)
  const moves =
    animated && presets.some((p) => Number(p.params.speed ?? 0) !== 0)

  const controls: Control[] = []
  const props: { key: string; expression: string }[] = []
  const settings: { key: string; about: string }[] = []

  const add = (control: Control, expression: string, about: string) => {
    controls.push(control)
    props.push({ key: control.key, expression })
    settings.push({ key: control.key, about })
  }

  const params = [
    ...readParams(text, Component),
    ...(moves ? [{ key: "speed", type: "number" }] : []),
    ...SIZING.map((key) => ({ key, type: key === "fit" ? "fit" : "number" })),
  ]
  const seen = new Set<string>()
  for (const { key, type } of params) {
    // A shader's own setting (e.g. Waves' rotation) wins over the shared sizing one.
    if (SKIPPED.has(key) || seen.has(key)) continue
    seen.add(key)
    const doc = docs.get(key)
    const about = doc?.about ?? label(key)
    const presetValues = presets
      .map((p) => p.params[key])
      .filter((v) => v !== undefined)

    if (key === "image") {
      const samples = isLogo ? ["logo", "shapes"] : ["shapes", "landscape"]
      add(
        {
          key,
          label: isLogo ? "Logo" : "Image",
          type: "picture",
          samples: `@@samples(${samples.join(",")})`,
          default: `@@sample(${samples[0]})`,
        },
        key,
        isLogo
          ? "the logo to animate, black on transparent works best"
          : "the image the filter is applied to"
      )
      continue
    }
    if (key === "colors") {
      add(
        {
          key,
          label: "Colours",
          type: "colors",
          max: meta?.maxColorCount ?? 10,
          default: (base.colors as string[]).join(","),
        },
        `${key}.split(",")`,
        about
      )
      continue
    }
    if (key === "fit") {
      add(
        {
          key,
          label: "Fit",
          type: "select",
          options: ["contain", "cover", "none"].map((v) => ({
            value: v,
            label: label(v),
          })),
          default: base.fit ?? "contain",
        },
        `${key} as ${Component}Props["fit"]`,
        "how the graphic fits the frame"
      )
      continue
    }
    if (enums.has(type)) {
      add(
        {
          key,
          label: label(key),
          type: "select",
          options: enums.get(type)!.map((v) => ({ value: v, label: label(v) })),
          default: base[key],
        },
        `${key} as ${Component}Props["${key}"]`,
        about
      )
      continue
    }
    if (type === "boolean") {
      add(
        { key, label: label(key), type: "toggle", default: Boolean(base[key]) },
        key,
        about
      )
      continue
    }
    if (type === "string" && /color/i.test(key)) {
      add(
        { key, label: label(key), type: "color", default: String(base[key]) },
        key,
        about
      )
      continue
    }
    if (type === "number") {
      const numbers = presetValues.map(Number)
      const fallback: Record<string, [number, number]> = {
        speed: [0, 2],
        scale: [0.1, 4],
        rotation: [0, 360],
        offsetX: [-1, 1],
        offsetY: [-1, 1],
      }
      let [min, max] =
        doc?.min !== undefined
          ? [doc.min, doc.max!]
          : (fallback[key] ?? [0, Math.max(1, ...numbers)])
      min = Math.min(min, ...numbers)
      max = Math.max(max, ...numbers)
      const value = Number(base[key] ?? min)
      add(
        {
          key,
          label: label(key),
          type: "slider",
          min,
          max,
          step: stepFor(min, max, [value]),
          default: round(value),
        },
        key,
        about
      )
      continue
    }
    throw new Error(`${name}: don't know how to control ${key} (${type})`)
  }

  const defaults = Object.fromEntries(controls.map((c) => [c.key, c.default]))
  const keys = controls.map((c) => c.key)
  const tags = [
    "paper",
    "shader",
    isFilter ? "image filter" : isLogo ? "logo animation" : "effect",
  ]
  const title = label(camel(name)).replace("cmyk", "CMYK")
  const presetList = presets.map((p) => ({
    name: p.name,
    values: Object.fromEntries(
      controls
        .filter((c) => p.params[c.key] !== undefined && c.type !== "picture")
        .map((c) => [
          c.key,
          c.type === "colors"
            ? (p.params[c.key] as string[]).join(",")
            : p.params[c.key],
        ])
    ),
  }))

  const literal = (value: unknown) =>
    JSON.stringify(value, null, 2)
      .replace(
        /"@@samples\(([^)]*)\)"/g,
        (_, list: string) =>
          `[${list
            .split(",")
            .map((s) => `paperSamples.${s}`)
            .join(", ")}]`
      )
      .replace(
        /"@@sample\((\w+)\)"/g,
        (_, s: string) => `paperSamples.${s}.value`
      )

  const sampleDefaults = Object.fromEntries(
    controls
      .filter((c) => c.type === "picture")
      .map((c) => [c.key, String(c.default)])
  )
  // The copied file can't import the app's samples, so it carries the default picture itself.
  const fileDefaults = Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      sampleDefaults[key]
        ? `@@file-sample(${String(value).match(/@@sample\((\w+)\)/)![1]})`
        : value,
    ])
  )

  const componentFile = `"use client"

// ${title}, from Paper Shaders (https://shaders.paper.design), licensed Apache 2.0.
// Needs: npm i @paper-design/shaders-react@${VERSION}
import type { ReactNode } from "react"
import { ${Component}, type ${Component}Props } from "@paper-design/shaders-react"

// @inspo-defaults-start
const defaults = {
${Object.entries(fileDefaults)
  .map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`)
  .join("\n")}
}
// @inspo-defaults-end

type ${Component}ShaderProps = Partial<typeof defaults> & { children?: ReactNode }

export default function ${Component}Shader(props: ${Component}ShaderProps) {
  const { children, ${keys.join(", ")} } = { ...defaults, ...props }
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <${Component}
${props.map((p) => `        ${p.key}={${p.expression}}`).join("\n")}${animated && !moves ? "\n        speed={0}" : ""}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {children && (
        <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {children}
        </div>
      )}
    </div>
  )
}
`
  const usesSamples = controls.some((c) => c.type === "picture")
  const metaFile = `import { paperPrompt${usesSamples ? ", paperSamples" : ""} } from "../paper"
import { defineComponent } from "../types"

// Generated by scripts/generate-paper-components.ts from Paper's own descriptions.
const settings = ${JSON.stringify(settings, null, 2)}

export default defineComponent({
  slug: "paper-${name}",
  title: ${JSON.stringify(title)},
  description: ${JSON.stringify(`${summary} By Paper Shaders.`)},
  tags: ${JSON.stringify(tags)},
  createdAt: "${CREATED}",
  controls: ${literal(controls)},
  presets: ${JSON.stringify(presetList, null, 2)},
  prompt: (values) =>
    paperPrompt(${JSON.stringify(Component)}, ${JSON.stringify(title.toLowerCase())}, ${JSON.stringify(summary)}, settings, values),
})
`
  const dir = path.join(ROOT, "src/library", `paper-${name}`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "meta.tsx"), metaFile)
  return {
    dir,
    componentFile,
    sampleNames: Object.values(fileDefaults).filter(
      (v) => typeof v === "string" && v.startsWith("@@file-sample")
    ),
  }
}

// Sample pictures are written into each copied file from the same source as the app's.
const { paperSamples } = (await import(
  path.join(ROOT, "src/library/paper.ts")
)) as {
  paperSamples: Record<string, { value: string }>
}

let count = 0
for (const file of fs
  .readdirSync(TYPES)
  .filter((f) => f.endsWith(".d.ts"))
  .sort()) {
  const { dir, componentFile } = generate(file)
  const finished = componentFile.replace(
    /"@@file-sample\((\w+)\)"/g,
    (_, s: string) => JSON.stringify(paperSamples[s].value)
  )
  fs.writeFileSync(path.join(dir, "component.tsx"), finished)
  count++
}
console.log(`Generated ${count} Paper components (version ${VERSION}).`)
