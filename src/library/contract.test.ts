import ts from "typescript"
import { describe, expect, test } from "vitest"
import { bakeValues, DEFAULTS_END, forCopy, DEFAULTS_START } from "./code"
import { library } from "./index"
import { defaultValues, type ComponentMeta } from "./types"

// Read separately from the registry so the folder check doesn't trust it.
const metaFiles = import.meta.glob<{ default: ComponentMeta }>("./*/meta.tsx", {
  eager: true,
})

// The text between the defaults markers: what Copy code rewrites.
function defaultsBlock(source: string): string {
  const start = source.indexOf(DEFAULTS_START)
  const end = source.indexOf(DEFAULTS_END)
  if (start === -1 || end < start) throw new Error("Missing defaults block")
  return source.slice(start + DEFAULTS_START.length, end)
}

// Runs the defaults block and returns the object it defines.
function evalDefaults(source: string): Record<string, unknown> {
  const js = ts.transpileModule(defaultsBlock(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return new Function(`${js}\nreturn defaults`)()
}

// Everything the file loads (static, side-effect, re-export, dynamic import
// and require) plus any className use, read from the syntax tree so comments
// and strings can't fool it.
function copyRuleBreaks(source: string) {
  const file = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const imports: string[] = []
  let classNames = 0
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      imports.push((node.moduleSpecifier as ts.StringLiteral).text)
    } else if (ts.isImportEqualsDeclaration(node)) {
      imports.push(node.moduleReference.getText(file))
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      const [arg] = node.arguments
      imports.push(arg && ts.isStringLiteralLike(arg) ? arg.text : "<dynamic>")
    } else if (
      ts.isJsxAttribute(node) &&
      node.name.getText(file) === "className"
    ) {
      classNames++
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return { imports, classNames }
}

describe("copy-rule checks", () => {
  test("catch every way of loading another file", () => {
    const source = [
      `import "./x.css"`,
      `import a from "a"`,
      `import type { B } from "b"`,
      `export { c } from "c"`,
      `const d = import("d")`,
      `const e = require("e")`,
      `const f = import(name)`,
      `import g = require("g")`,
    ].join("\n")
    expect(copyRuleBreaks(source).imports).toEqual([
      "./x.css",
      "a",
      "b",
      "c",
      "d",
      "e",
      "<dynamic>",
      `require("g")`,
    ])
  })

  test("ignore comments and strings that look like imports", () => {
    const source = `// copied from "somewhere"\nconst s = 'import x from "y"'\n`
    expect(copyRuleBreaks(source).imports).toEqual([])
  })

  test("spot className", () => {
    expect(copyRuleBreaks(`const x = <div className="p-4" />`).classNames).toBe(
      1
    )
  })

  test("only look inside the defaults block", () => {
    const source = `const size = 1\n${DEFAULTS_START}\nconst defaults = { tint: "#fff" }\n${DEFAULTS_END}\n`
    expect(defaultsBlock(source)).not.toMatch(/\bsize:/)
    expect(evalDefaults(source)).toEqual({ tint: "#fff" })
  })
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
      const { imports } = copyRuleBreaks(entry.source)
      expect(imports.length).toBeGreaterThan(0)
      for (const from of imports) expect(from).toBe("react")
    })

    test("styles inline, no Tailwind classes", () => {
      expect(copyRuleBreaks(entry.source).classNames).toBe(0)
    })

    test("has a default export", () => {
      expect(entry.source).toMatch(/export default function/)
    })

    test("every control has a matching default in the file", () => {
      const block = defaultsBlock(entry.source)
      for (const c of entry.meta.controls) {
        expect(block).toMatch(new RegExp(`\\b${c.key}:`))
      }
    })

    // The file's own defaults are what someone gets if they copy it untouched
    // elsewhere, so they must not drift from the controls' defaults.
    test("file defaults match the control defaults", () => {
      expect(evalDefaults(entry.source)).toEqual(
        defaultValues(entry.meta.controls)
      )
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

    // Copy prompt must never hand out an address that only works in this tab.
    test("prompt never contains an uploaded file's address", () => {
      const values = defaultValues(entry.meta.controls)
      for (const c of entry.meta.controls) {
        if (c.type !== "image") continue
        values[c.key] = `url("blob:http://x/1"), ${c.default}`
      }
      const prompt = entry.meta.prompt(forCopy(values, entry.meta.controls))
      expect(prompt).not.toContain("blob:")
      expect(prompt).not.toContain("data:")
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
