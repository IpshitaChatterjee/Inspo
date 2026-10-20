# Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second sub-app, Components, to Inspo: a growing library of live, tweakable React components (built by prompting Claude) whose prompt and code can be copied with the current settings baked in.

**Architecture:** Each component is a folder in `src/library/<slug>/` holding a self-contained `component.tsx` (the exact file that gets copied, with a marked defaults block) and a `meta.tsx` (title, description, tags, controls, prompt). A registry finds them with `import.meta.glob`, so they ship in both the Mac app and the published gallery with no server work. The UI reuses Inspo's sidebar, grid motion and opened-view shell, switching between apps with a dropdown at the top of the sidebar.

**Tech Stack:** React 19, TypeScript, Vite 8, shadcn (base-vega preset, Base UI), motion, lucide-react; Vitest for tests (new).

**Spec:** `docs/superpowers/specs/2026-10-20-components-design.md`

## Global Constraints

- Copied code is one `.tsx` file: first line `"use client"`, a default-exported component, imports only from `react`, styling inline or in a `<style>` tag, no Tailwind, no three.js.
- Current control values are written into copied code as the component's defaults.
- An uploaded image becomes `/your-image.jpg` in copied code, with a comment to replace it, and the built-in gradient must still show if that file is missing.
- Built-in backgrounds are gradients made in code; no image files are added to the repo.
- No link from a component back to inspos. No picking inspos as backgrounds. No in-app code editor. No in-app tag editing for components.
- Opened view uses layout A: live preview left, panel right (title, description, tags, controls, Copy prompt, Copy code); phones stack preview over panel.
- Each app searches only its own items; the All / Images / Videos switch is hidden in Components.
- Components appear in the published gallery (read-only gallery can still tweak and copy).
- The repo is public: no personal details in component files. Everything stays free.

## Review Focus

- Pasting copied code into a fresh Next.js page: it must compile and render with no extra installs → contract test in Task 2.
- Choosing an uploaded image, then copying: code must say `/your-image.jpg` and still render the gradient underneath → test in Task 1.
- A non-image file, or a very large image, chosen in the image control → only `image/*` accepted; the preview's temporary image link is released when replaced or on close → covered in Task 6.
- Switching between Inspo and Components while a tag or search is active → view resets to "Everything", search clears → test in Task 4.
- Copying when the browser blocks the clipboard (some phones, private windows) → falls back to a hidden-textarea copy, and says so if both fail → covered in Task 6.

---

### Task 1: Test runner, component contract types, and baking values into code

**Files:**
- Modify: `package.json` (add `vitest` dev dependency, script `"test": "vitest run"`)
- Modify: `vite.config.ts` (add `test: { environment: "node" }`; keep `/// <reference types="vitest/config" />` at top)
- Create: `src/library/types.ts`
- Create: `src/library/code.ts`
- Test: `src/library/code.test.ts`

**Interfaces:**
- Produces (in `types.ts`):
  ```ts
  export type ControlValue = string | number | boolean
  export type Control =
    | { key: string; label: string; type: "slider"; min: number; max: number; step: number; default: number; unit?: string }
    | { key: string; label: string; type: "color"; default: string }
    | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; default: string }
    | { key: string; label: string; type: "toggle"; default: boolean }
    | { key: string; label: string; type: "text"; default: string }
    // Value is a CSS background: a gradient, or `url("blob:…"), <gradient>` once a file is chosen.
    | { key: string; label: string; type: "image"; gradients: { label: string; value: string }[]; default: string }
  export type Values = Record<string, ControlValue>
  export type ComponentMeta = {
    slug: string; title: string; description: string; tags: string[]; createdAt: string // ISO date
    controls: Control[]
    prompt: (values: Values) => string
    demo?: React.ReactNode // shown on top of the component in previews (e.g. a sample headline)
  }
  export function defineComponent(meta: ComponentMeta): ComponentMeta
  export function defaultValues(controls: Control[]): Values
  ```
- Produces (in `code.ts`):
  - `DEFAULTS_START = "// @inspo-defaults-start"`, `DEFAULTS_END = "// @inspo-defaults-end"`
  - `bakeValues(source: string, values: Values, controls: Control[]): string`: replaces everything between the two markers with `const defaults = { … }` built from `values`; image values whose `url(...)` is a `blob:` or `data:` URL become `url("/your-image.jpg"), <gradient part of the value>` preceded by the line comment `// Replace /your-image.jpg with your image; the gradient shows until you do.`; throws `Error("Missing defaults block")` if either marker is absent.

- [ ] **Step 1: Install Vitest and add the script and config**

Run: `npm i -D vitest` then add the script and `test` config.

- [ ] **Step 2: Write the failing tests** in `src/library/code.test.ts`

```ts
const source = `"use client"\nimport { useState } from "react"\n// @inspo-defaults-start\nconst defaults = { size: 2 }\n// @inspo-defaults-end\nexport default function X() { return null }\n`
const controls: Control[] = [
  { key: "size", label: "Dot size", type: "slider", min: 1, max: 8, step: 0.5, default: 2 },
  { key: "tint", label: "Dot colour", type: "color", default: "#ffffff" },
  { key: "round", label: "Round dots", type: "toggle", default: true },
  { key: "bg", label: "Background", type: "image", gradients: [{ label: "Sky", value: "linear-gradient(#9cc9ff, #9fc48a)" }], default: "linear-gradient(#9cc9ff, #9fc48a)" },
]
test("writes the current values into the defaults block", () => {
  const out = bakeValues(source, { size: 3.5, tint: "#ff0000", round: false, bg: "linear-gradient(#9cc9ff, #9fc48a)" }, controls)
  expect(out).toContain(`size: 3.5`); expect(out).toContain(`tint: "#ff0000"`); expect(out).toContain(`round: false`)
  expect(out).toContain(`bg: "linear-gradient(#9cc9ff, #9fc48a)"`)
  expect(out.startsWith(`"use client"`)).toBe(true); expect(out).toContain("export default function X")
})
test("turns an uploaded image into a placeholder that keeps the gradient", () => {
  const out = bakeValues(source, { size: 2, tint: "#fff", round: true, bg: `url("blob:http://x/123"), linear-gradient(#9cc9ff, #9fc48a)` }, controls)
  expect(out).toContain(`bg: "url(\\"/your-image.jpg\\"), linear-gradient(#9cc9ff, #9fc48a)"`)
  expect(out).toContain("// Replace /your-image.jpg with your image")
  expect(out).not.toContain("blob:")
})
test("refuses a file without the defaults markers", () => {
  expect(() => bakeValues(`export default 1`, {}, [])).toThrow("Missing defaults block")
})
test("defaultValues reads each control's default", () => {
  expect(defaultValues(controls)).toEqual({ size: 2, tint: "#ffffff", round: true, bg: "linear-gradient(#9cc9ff, #9fc48a)" })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/library/code.test.ts`
Expected: FAIL (modules not found)

- [ ] **Step 4: Implement `types.ts` and `code.ts`**

Serialize with `JSON.stringify` per value (strings quoted and escaped, numbers and booleans bare), one `key: value,` per line in control order, two-space indent.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: 4 passed

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/library
git commit -m "Components: contract types and baking control values into copied code"
```

---

### Task 2: Registry, the copy contract, and the first component (Dotted glass)

**Files:**
- Create: `src/library/index.ts`
- Create: `src/library/dotted-glass/component.tsx`
- Create: `src/library/dotted-glass/meta.tsx`
- Test: `src/library/contract.test.ts`

**Interfaces:**
- Consumes: `ComponentMeta`, `Values`, `defineComponent`, `defaultValues` (Task 1); `DEFAULTS_START`/`DEFAULTS_END` (Task 1)
- Produces (in `index.ts`):
  ```ts
  export type LibraryEntry = {
    meta: ComponentMeta
    source: string // raw text of component.tsx
    load: () => Promise<{ default: React.ComponentType<Partial<Values> & { children?: React.ReactNode }> }>
  }
  export const library: LibraryEntry[] // newest createdAt first
  export function findComponent(slug: string): LibraryEntry | undefined
  ```
  Built with `import.meta.glob("./*/meta.tsx", { eager: true })`, `import.meta.glob("./*/component.tsx", { query: "?raw", import: "default", eager: true })` and `import.meta.glob("./*/component.tsx")` (lazy, so each component's code loads only when shown).

- Dotted glass (`component.tsx`): props `background` (CSS background string), `blur` (px), `dotSize` (px), `spacing` (px), `dotColor` (hex), `dotOpacity` (0–1), `shape` (`"circle" | "square"`), `blend` (`"soft-light" | "overlay" | "normal"`), plus `children` rendered centred on top. Layers: an oversized blurred div with `background`, then a dot grid made from `radial-gradient` (circle) or `linear-gradient` pair (square) with `background-size: spacing × spacing`, `mix-blend-mode: blend`. Fills its parent (`position: relative; width: 100%; height: 100%`). Defaults match the user's inspo: sky-to-meadow gradient, blur 40, dotSize 1.5, spacing 9, dotColor `#ffffff`, dotOpacity 0.7, shape `square`, blend `soft-light`.
- Dotted glass (`meta.tsx`): slug `dotted-glass`, title `Dotted glass`, description `A soft grid of dots over a blurred image or gradient.`, tags `["background", "shader"]`, createdAt `2026-10-20`; one control per prop (background as an `image` control with 3 gradients: Sky meadow, Dusk, Mint); `prompt(values)` returns plain language that names every current value; `demo` is the headline "Transform the way your team operates" in a serif at large size.

- [ ] **Step 1: Write the failing contract test** in `src/library/contract.test.ts`, looping over `library`:

```ts
for (const entry of library) describe(entry.meta.slug, () => {
  test("folder name matches slug", () => { /* glob key "./<slug>/meta.tsx" */ })
  test("copied file starts with use client and only imports react", () => {
    expect(entry.source.trimStart().startsWith(`"use client"`)).toBe(true)
    for (const [, from] of entry.source.matchAll(/from\s+["']([^"']+)["']/g)) expect(from).toBe("react")
  })
  test("has a default export", () => expect(entry.source).toMatch(/export default function/))
  test("every control has a matching default in the file", () => {
    for (const c of entry.meta.controls) expect(entry.source).toMatch(new RegExp(`\\b${c.key}:`))
  })
  test("baked code still transpiles", () => {
    const baked = bakeValues(entry.source, defaultValues(entry.meta.controls), entry.meta.controls)
    const out = ts.transpileModule(baked, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true })
    expect(out.diagnostics ?? []).toHaveLength(0)
  })
  test("prompt mentions every current value", () => {
    const values = defaultValues(entry.meta.controls)
    const prompt = entry.meta.prompt(values)
    for (const c of entry.meta.controls) if (c.type !== "image") expect(prompt).toContain(String(values[c.key]))
  })
})
test("library has at least one component", () => expect(library.length).toBeGreaterThan(0))
```

(`ts` is `import ts from "typescript"`, already installed.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL (`src/library/index.ts` not found)

- [ ] **Step 3: Implement the registry and Dotted glass** per the Interfaces block.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test && npx tsc -b && npx eslint .`
Expected: all pass, no type or lint errors

- [ ] **Step 5: Commit**

```bash
git add src/library
git commit -m "Components: registry, copy contract tests, and Dotted glass"
```

---

### Task 3: Share the opened-view shell between Inspo and Components

**Files:**
- Create: `src/components/detail-shell.tsx`
- Modify: `src/components/inspo-detail.tsx` (use the shell; behaviour unchanged)

**Interfaces:**
- Produces:
  ```ts
  export function DetailShell(props: {
    label: string
    onClose: () => void
    onStep: (direction: -1 | 1) => void
    media: React.ReactNode        // the left side (already sized by the caller)
    panel: React.ReactNode        // the right side
  }): JSX.Element
  export function DetailNav(props: { onStep: (d: -1 | 1) => void; onClose: () => void }): JSX.Element // the ← → × row
  export function Field(props: { label: string; children: React.ReactNode }): JSX.Element
  ```
  The shell owns: backdrop and its fade, Escape/←/→ keys (ignored while typing), the phone layout (stacked, scrolling, floating close button), and the panel's slide-in.

- [ ] **Step 1: Move the shell, nav row and `Field` out of `inspo-detail.tsx` into `detail-shell.tsx`; make `InspoDetail` render `<DetailShell media={…} panel={…} />`.**

- [ ] **Step 2: Verify Inspo's opened view is unchanged**

Run: `npx tsc -b && npx eslint . && npx vite build`, then screenshot an opened item at 1440×900 and 390×844 (scratchpad puppeteer script) and compare with the current look.
Expected: builds clean; screenshots match today's (morph, panel, phone stacking, floating close).

- [ ] **Step 3: Commit**

```bash
git add src/components/detail-shell.tsx src/components/inspo-detail.tsx
git commit -m "Share the opened-view shell so Components can reuse it"
```

---

### Task 4: App switcher and a sidebar that works for either app

**Files:**
- Create: `src/hooks/use-current-app.ts`
- Create: `src/components/app-switcher.tsx`
- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/components/mobile-tags.tsx`
- Modify: `src/App.tsx`
- Test: `src/hooks/use-current-app.test.ts`

**Interfaces:**
- Produces (in `use-current-app.ts`):
  ```ts
  export type AppName = "inspo" | "components"
  export function readSavedApp(storage: Pick<Storage, "getItem"> | null): AppName // "inspo" when missing, unknown, or storage throws
  export function useCurrentApp(): [AppName, (app: AppName) => void] // persists under localStorage key "inspo-current-app"
  ```
- Produces (`app-switcher.tsx`): `AppSwitcher({ app, counts: Record<AppName, number>, onChange })`, replacing the "Inspo" wordmark at the top of the sidebar with a dropdown (shadcn `DropdownMenu`) listing Inspo and Components with counts and a check on the current one.
- Changes `AppSidebar` props to be app-neutral: `{ app, counts, tags: TagCount[], total: number, untagged: number, view, publish, onApp, onView, onPublish, onSetPassword }`; Inspo passes `countTags(items)` as before; tag rename/remove menus and the Shared gallery box stay Inspo-only. `MobileTags` takes `tags: TagCount[]` and `untagged: number` instead of `items`.
- In `App.tsx`: switching app resets `view` to `{ kind: "all" }` and clears the search; the type switch renders only for Inspo.

- [ ] **Step 1: Write the failing tests** in `src/hooks/use-current-app.test.ts`

```ts
test("defaults to inspo with no storage", () => expect(readSavedApp(null)).toBe("inspo"))
test("reads a saved choice", () => expect(readSavedApp({ getItem: () => "components" })).toBe("components"))
test("ignores junk", () => expect(readSavedApp({ getItem: () => "nope" })).toBe("inspo"))
test("survives storage that throws", () => expect(readSavedApp({ getItem: () => { throw new Error("blocked") } })).toBe("inspo"))
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/hooks/use-current-app.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement the hook, the switcher, and the app-neutral sidebar/mobile tags; wire into `App.tsx`.**

- [ ] **Step 4: Verify**

Run: `npm test && npx tsc -b && npx eslint . && npx vite build`
Expected: all pass. Manually: the dropdown switches apps, remembers the choice after reload, and switching with a tag or search active lands on "Everything" with search cleared.

- [ ] **Step 5: Commit**

```bash
git add src/hooks src/components/app-switcher.tsx src/components/app-sidebar.tsx src/components/mobile-tags.tsx src/App.tsx
git commit -m "App switcher between Inspo and Components"
```

---

### Task 5: The Components grid with live cards and search

**Files:**
- Create: `src/components/component-card.tsx`
- Create: `src/components/component-grid.tsx`
- Create: `src/library/search.ts`
- Modify: `src/App.tsx`
- Test: `src/library/search.test.ts`

**Interfaces:**
- Consumes: `library`, `LibraryEntry` (Task 2); `AppName` (Task 4); `View` from `app-sidebar.tsx`
- Produces:
  - `filterComponents(entries: LibraryEntry[], view: View, query: string): LibraryEntry[]`: tag views match `meta.tags`; `untagged` matches empty tags; query words must all appear in title, description or tags (case-insensitive, leading `#` ignored).
  - `componentTagCounts(entries: LibraryEntry[]): TagCount[]` (all `mine: true`).
  - `ComponentGrid({ entries, onOpen })`: a responsive grid of 4:3 cards with Inspo's entry motion (fade/blur-in, gentle hover scale).
  - `ComponentCard({ entry, onOpen })`: loads `entry.load()` lazily and renders the component with its default values and `meta.demo`, **only while the card is on screen** (IntersectionObserver, `rootMargin: "200px"`); off screen it shows a plain muted block of the same size. Title and tags appear on hover, like Inspo.

- [ ] **Step 1: Write the failing tests** in `src/library/search.test.ts` with two fake entries (`a`: tags `["background","shader"]`, title "Dotted glass"; `b`: tags `[]`, title "Plain"):

```ts
test("everything", () => expect(filterComponents([a, b], { kind: "all" }, "")).toEqual([a, b]))
test("by tag", () => expect(filterComponents([a, b], { kind: "tag", name: "shader" }, "")).toEqual([a]))
test("untagged", () => expect(filterComponents([a, b], { kind: "untagged" }, "")).toEqual([b]))
test("search words, any case, # ignored", () => expect(filterComponents([a, b], { kind: "all" }, "#Shader dotted")).toEqual([a]))
test("tag counts", () => expect(componentTagCounts([a, b])).toEqual([{ name: "background", count: 1, mine: true }, { name: "shader", count: 1, mine: true }]))
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/library/search.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement search, grid and card; in `App.tsx` render the grid, heading and counts when the app is Components (sidebar tags from `componentTagCounts`).**

- [ ] **Step 4: Verify**

Run: `npm test && npx tsc -b && npx eslint . && npx vite build`, then screenshot the Components grid at 1440×900 and 390×844.
Expected: all pass; Dotted glass renders live in its card with the demo headline.

- [ ] **Step 5: Commit**

```bash
git add src/components/component-card.tsx src/components/component-grid.tsx src/library/search.ts src/library/search.test.ts src/App.tsx
git commit -m "Components grid with live cards, tags and search"
```

---

### Task 6: Opened component: live preview, controls, Copy prompt and Copy code

**Files:**
- Create: `src/components/component-detail.tsx`
- Create: `src/components/component-controls.tsx`
- Create: `src/lib/copy-text.ts`
- Modify: `src/App.tsx`
- Add shadcn parts: `npx shadcn@latest add slider switch -y`
- Test: `src/lib/copy-text.test.ts`

**Interfaces:**
- Consumes: `DetailShell`, `DetailNav`, `Field` (Task 3); `LibraryEntry`, `bakeValues`, `defaultValues` (Tasks 1–2)
- Produces:
  - `copyText(text: string): Promise<boolean>`: tries `navigator.clipboard.writeText`, then a hidden `<textarea>` + `document.execCommand("copy")`; resolves `false` only if both fail.
  - `ComponentControls({ controls, values, onChange })`: slider (shadcn Slider + value readout with unit), colour (native colour input + hex text field), select (shadcn Select), toggle (shadcn Switch), text (Input), image (Select of the control's gradients plus **Choose file…**, which accepts only `image/*` and sets `url("blob:…"), <current gradient>`). Releases the previous blob URL with `URL.revokeObjectURL` when replaced and when the view closes.
  - `ComponentDetail({ entry, onClose, onStep })`: layout A via `DetailShell`. Left: the live component at large size with `meta.demo`. Right: title, description, tags (read-only chips), **Controls** with a **Reset** link, then **Copy prompt** (primary) and **Copy code** (dark) buttons; on success toast "Prompt copied" / "Code copied — paste it into a React or Next.js file"; on failure toast "Couldn't copy. Your browser blocked it." Values start from `defaultValues` and reset on open.

- [ ] **Step 1: Write the failing tests** in `src/lib/copy-text.test.ts` (Vitest with a stubbed `navigator`/`document`):

```ts
test("uses the clipboard when it can", async () => { /* stub navigator.clipboard.writeText resolves */ expect(await copyText("x")).toBe(true) })
test("falls back to execCommand when the clipboard refuses", async () => { /* writeText rejects; execCommand returns true */ expect(await copyText("x")).toBe(true) })
test("reports failure when both fail", async () => { /* both fail */ expect(await copyText("x")).toBe(false) })
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/copy-text.test.ts`
Expected: FAIL

- [ ] **Step 3: Add the shadcn slider and switch, then implement `copyText`, `ComponentControls` and `ComponentDetail`; open it from the grid in `App.tsx` (← → step through the filtered components).**

- [ ] **Step 4: Verify**

Run: `npm test && npx tsc -b && npx eslint . && npx vite build`. Then, in a browser (scratchpad puppeteer script with clipboard permission): open Dotted glass, set dot size to 3 and colour to `#ff0000`, Copy code, read the clipboard.
Expected: tests pass; clipboard text starts with `"use client"` and contains `dotSize: 3` and `dotColor: "#ff0000"`; Copy prompt's text mentions `3` and `#ff0000`; choosing a file updates the preview, and copied code then contains `/your-image.jpg`.

- [ ] **Step 5: Paste test**

Write the copied code into a scratchpad Next.js-style check: `npx tsc --jsx react-jsx --noEmit --skipLibCheck` on the file with `react` types available (from the project's node_modules).
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/component-detail.tsx src/components/component-controls.tsx src/lib/copy-text.ts src/lib/copy-text.test.ts src/components/ui src/App.tsx package.json package-lock.json
git commit -m "Opened component: controls, Copy prompt and Copy code with settings baked in"
```

---

### Task 7: Phones, the shared gallery, and docs

**Files:**
- Modify: `src/App.tsx` (phone: `MobileTags` for Components; app switcher reachable on phones, as a compact dropdown in the header when the sidebar is hidden)
- Modify: `README.md` (a "Components" section: what it is, how a new one is made by asking Claude, folder layout, the copy contract)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Add the phone switcher and Components tag chips.**

- [ ] **Step 2: Verify locally**

Run: `npm test && npx tsc -b && npx eslint . && npx vite build`; screenshots of Components at 390×844 (grid and opened view).
Expected: switcher reachable, chips scroll, opened view stacks preview over panel.

- [ ] **Step 3: Publish and verify the gallery**

Run: `launchctl kickstart -k gui/$(id -u)/com.inspo.app`, then `curl -X POST localhost:4321/api/publish` and wait for idle; open the gallery URL in the scratchpad browser.
Expected: Components is in the switcher, Dotted glass runs live, controls work, Copy code works (read-only gallery, no lock needed).

- [ ] **Step 4: Commit and push**

```bash
git add src/App.tsx README.md
git commit -m "Components on phones and in the shared gallery; README"
git push
```
