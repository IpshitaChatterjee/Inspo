import type { Control, ControlValue, Values } from "./types"

export const DEFAULTS_START = "// @inspo-defaults-start"
export const DEFAULTS_END = "// @inspo-defaults-end"

const PLACEHOLDER_NOTE =
  "// Replace /your-image.jpg with your image; the gradient shows until you do."

// An uploaded file lives at a blob: or data: URL that means nothing outside the
// app, so it becomes a placeholder path and keeps only the gradient part.
function placeholderForUpload(value: string): string | null {
  const match = value.match(/^url\((["']?)(?:blob|data):.*?\1\)\s*,\s*(.*)$/s)
  if (!match) return null
  return `url("/your-image.jpg"), ${match[2]}`
}

// What leaves the app (copied code or a copied prompt): uploaded images become
// the placeholder path, everything else stays as it is.
export function forCopy(values: Values, controls: Control[]): Values {
  const out: Values = { ...values }
  for (const control of controls) {
    const value = out[control.key]
    if (control.type === "image" && typeof value === "string") {
      const placeholder = placeholderForUpload(value)
      if (placeholder) out[control.key] = placeholder
    }
  }
  return out
}

export function bakeValues(
  source: string,
  values: Values,
  controls: Control[]
): string {
  const start = source.indexOf(DEFAULTS_START)
  const end = source.indexOf(DEFAULTS_END)
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Missing defaults block")
  }

  const copied = forCopy(values, controls)
  const lines: string[] = []
  for (const control of controls) {
    const value: ControlValue = copied[control.key] ?? control.default
    if (value !== (values[control.key] ?? control.default)) {
      lines.push(`  ${PLACEHOLDER_NOTE}`)
    }
    lines.push(`  ${control.key}: ${JSON.stringify(value)},`)
  }

  const block = `const defaults = {\n${lines.join("\n")}\n}`
  return (
    source.slice(0, start) + `${DEFAULTS_START}\n${block}\n` + source.slice(end)
  )
}
