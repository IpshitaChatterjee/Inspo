import { describe, expect, test } from "vitest"
import { bakeValues } from "./code"
import { defaultValues, type Control } from "./types"

const source = `"use client"\nimport { useState } from "react"\n// @inspo-defaults-start\nconst defaults = { size: 2 }\n// @inspo-defaults-end\nexport default function X() { return null }\n`
const controls: Control[] = [
  {
    key: "size",
    label: "Dot size",
    type: "slider",
    min: 1,
    max: 8,
    step: 0.5,
    default: 2,
  },
  { key: "tint", label: "Dot colour", type: "color", default: "#ffffff" },
  { key: "round", label: "Round dots", type: "toggle", default: true },
  {
    key: "bg",
    label: "Background",
    type: "image",
    gradients: [{ label: "Sky", value: "linear-gradient(#9cc9ff, #9fc48a)" }],
    default: "linear-gradient(#9cc9ff, #9fc48a)",
  },
]

describe("library code", () => {
  test("writes the current values into the defaults block", () => {
    const out = bakeValues(
      source,
      {
        size: 3.5,
        tint: "#ff0000",
        round: false,
        bg: "linear-gradient(#9cc9ff, #9fc48a)",
      },
      controls
    )
    expect(out).toContain(`size: 3.5`)
    expect(out).toContain(`tint: "#ff0000"`)
    expect(out).toContain(`round: false`)
    expect(out).toContain(`bg: "linear-gradient(#9cc9ff, #9fc48a)"`)
    expect(out.startsWith(`"use client"`)).toBe(true)
    expect(out).toContain("export default function X")
  })
  test("turns an uploaded image into a placeholder that keeps the gradient", () => {
    const out = bakeValues(
      source,
      {
        size: 2,
        tint: "#fff",
        round: true,
        bg: `url("blob:http://x/123"), linear-gradient(#9cc9ff, #9fc48a)`,
      },
      controls
    )
    expect(out).toContain(
      `bg: "url(\\"/your-image.jpg\\"), linear-gradient(#9cc9ff, #9fc48a)"`
    )
    expect(out).toContain("// Replace /your-image.jpg with your image")
    expect(out).not.toContain("blob:")
  })
  test("refuses a file without the defaults markers", () => {
    expect(() => bakeValues(`export default 1`, {}, [])).toThrow(
      "Missing defaults block"
    )
  })
  test("defaultValues reads each control's default", () => {
    expect(defaultValues(controls)).toEqual({
      size: 2,
      tint: "#ffffff",
      round: true,
      bg: "linear-gradient(#9cc9ff, #9fc48a)",
    })
  })
})
