import type { ReactNode } from "react"

export type ControlValue = string | number | boolean

export type Control =
  | {
      key: string
      label: string
      type: "slider"
      min: number
      max: number
      step: number
      default: number
      unit?: string
    }
  // "#rrggbb", or "#rrggbbaa" when the colour is partly see-through.
  | { key: string; label: string; type: "color"; default: string }
  // A list of colours, stored as "#aaaaaa,#bbbbbb".
  | {
      key: string
      label: string
      type: "colors"
      max: number
      default: string
    }
  // An image the component reads (not a CSS background): a built-in sample, or your own file.
  | {
      key: string
      label: string
      type: "picture"
      samples: { label: string; value: string }[]
      default: string
    }
  | {
      key: string
      label: string
      type: "select"
      options: { value: string; label: string }[]
      default: string
    }
  | { key: string; label: string; type: "toggle"; default: boolean }
  | { key: string; label: string; type: "text"; default: string }
  // Value is a CSS background: a gradient, or `url("blob:…"), <gradient>` once a file is chosen.
  | {
      key: string
      label: string
      type: "image"
      gradients: { label: string; value: string }[]
      default: string
    }

export type Values = Record<string, ControlValue>

export type ComponentMeta = {
  slug: string
  title: string
  description: string
  tags: string[]
  createdAt: string // ISO date
  controls: Control[]
  prompt: (values: Values) => string
  /** Ready-made combinations of control values, picked from a menu. */
  presets?: { name: string; values: Values }[]
  demo?: ReactNode // shown on top of the component in previews (e.g. a sample headline)
}

export function defineComponent(meta: ComponentMeta): ComponentMeta {
  return meta
}

export function defaultValues(controls: Control[]): Values {
  return Object.fromEntries(controls.map((c) => [c.key, c.default]))
}
