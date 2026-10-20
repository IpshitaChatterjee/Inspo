import ts from "typescript"
import { describe, expect, test } from "vitest"
import { bakeValues } from "./code"
import { library } from "./index"
import { defaultValues, type ComponentMeta } from "./types"

// Read separately from the registry so the folder check doesn't trust it.
const metaFiles = import.meta.glob<{ default: ComponentMeta }>("./*/meta.tsx", {
  eager: true,
})

// Every component in the library must pass these, so its copied code works
// when pasted into someone else's React or Next.js project.
for (const entry of library) {
  describe(entry.meta.slug, () => {
    test("folder name matches slug", () => {
      const folders = Object.entries(metaFiles)
        .filter(([, mod]) => mod.default === entry.meta)
        .map(([path]) => path)
      expect(folders).toEqual([`./${entry.meta.slug}/meta.tsx`])
    })

    test("copied file starts with use client and only imports react", () => {
      expect(entry.source.trimStart().startsWith(`"use client"`)).toBe(true)
      for (const [, from] of entry.source.matchAll(
        /from\s+["']([^"']+)["']/g
      )) {
        expect(from).toBe("react")
      }
    })

    test("has a default export", () => {
      expect(entry.source).toMatch(/export default function/)
    })

    test("every control has a matching default in the file", () => {
      for (const c of entry.meta.controls) {
        expect(entry.source).toMatch(new RegExp(`\\b${c.key}:`))
      }
    })

    // The file's own defaults are what someone gets if they copy it untouched
    // elsewhere, so they must not drift from the controls' defaults.
    test("file defaults match the control defaults", () => {
      for (const c of entry.meta.controls) {
        expect(entry.source).toContain(JSON.stringify(c.default))
      }
    })

    test("baked code still transpiles", () => {
      const baked = bakeValues(
        entry.source,
        defaultValues(entry.meta.controls),
        entry.meta.controls
      )
      const out = ts.transpileModule(baked, {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
        reportDiagnostics: true,
      })
      expect(out.diagnostics ?? []).toHaveLength(0)
    })

    test("prompt mentions every current value", () => {
      const values = defaultValues(entry.meta.controls)
      const prompt = entry.meta.prompt(values)
      for (const c of entry.meta.controls) {
        if (c.type !== "image") expect(prompt).toContain(String(values[c.key]))
      }
    })
  })
}

test("library has at least one component", () => {
  expect(library.length).toBeGreaterThan(0)
})
