import type { Values } from "./types"

// Shared by the Paper Shaders components (src/library/paper-*), which are
// generated from Paper's own descriptions by scripts/generate-paper-components.ts.
// Paper Shaders: https://shaders.paper.design, Apache 2.0.

export const PAPER_PACKAGE = "@paper-design/shaders-react"
// Pinned exactly, as Paper asks until their 1.0 (must match package.json).
export const PAPER_VERSION = "0.0.82"

const svg = (markup: string) => `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`

// Sample pictures for the image filters and logo animations, drawn in code so
// nothing licensed or personal ships with the app.
export const paperSamples = {
  shapes: {
    label: "Soft shapes",
    value: svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3efe6"/><stop offset="1" stop-color="#d9d2c3"/></linearGradient>
          <radialGradient id="a" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#e86f4f"/><stop offset="1" stop-color="#5b1f15"/></radialGradient>
          <radialGradient id="b" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#f6fbff"/><stop offset="0.55" stop-color="#4c7bd9"/><stop offset="1" stop-color="#132552"/></radialGradient>
          <radialGradient id="c" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fffbe9"/><stop offset="0.55" stop-color="#e5b84a"/><stop offset="1" stop-color="#5c4210"/></radialGradient>
        </defs>
        <rect width="1200" height="900" fill="url(#bg)"/>
        <path d="M0 700 C 250 620, 450 780, 700 700 S 1050 620, 1200 690 L1200 900 L0 900 Z" fill="#2f3a33"/>
        <circle cx="430" cy="420" r="230" fill="url(#a)"/>
        <circle cx="800" cy="360" r="170" fill="url(#b)"/>
        <circle cx="700" cy="620" r="120" fill="url(#c)"/>
      </svg>`
    ),
  },
  landscape: {
    label: "Landscape",
    value: svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fc6ef"/><stop offset="0.6" stop-color="#f4d9b8"/><stop offset="1" stop-color="#f7b58c"/></linearGradient>
          <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6dc"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="1200" height="900" fill="url(#sky)"/>
        <circle cx="820" cy="420" r="220" fill="url(#sun)"/>
        <path d="M0 560 L180 420 L320 520 L520 330 L720 520 L900 400 L1200 580 L1200 900 L0 900 Z" fill="#6f7f9a"/>
        <path d="M0 680 C 200 600, 380 700, 600 640 S 1000 600, 1200 670 L1200 900 L0 900 Z" fill="#3d5a4a"/>
        <path d="M0 800 C 300 740, 600 820, 900 770 S 1100 760, 1200 790 L1200 900 L0 900 Z" fill="#22352c"/>
      </svg>`
    ),
  },
  logo: {
    label: "Sample logo",
    value: svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
        <g fill="#000">
          <circle cx="400" cy="230" r="150"/>
          <circle cx="570" cy="400" r="150"/>
          <circle cx="400" cy="570" r="150"/>
          <circle cx="230" cy="400" r="150"/>
          <circle cx="400" cy="400" r="120"/>
        </g>
      </svg>`
    ),
  },
}

export type PaperSetting = { key: string; about: string }

/** The text Copy prompt gives for a Paper shader: what to install and every setting. */
export function paperPrompt(
  component: string,
  title: string,
  about: string,
  settings: PaperSetting[],
  values: Values
) {
  const lines = settings.map(({ key, about: what }) => {
    const value = values[key]
    if (key === "colors") {
      const list = String(value)
        .split(",")
        .map((c) => `"${c}"`)
        .join(", ")
      return `- colors: [${list}] (${what}; as one list: ${value})`
    }
    return `- ${key}: ${JSON.stringify(value)} (${what})`
  })
  return `Add the ${title} shader from Paper Shaders (https://shaders.paper.design) to my React or Next.js project: ${about}

Install it with: npm i ${PAPER_PACKAGE}@${PAPER_VERSION}
Then render <${component} /> from "${PAPER_PACKAGE}" in a "use client" component, absolutely positioned to fill its parent (position: absolute; inset: 0), with any content I pass as children centred on top.

Use these props:
${lines.join("\n")}

Expose them as props with these as the defaults.`
}
