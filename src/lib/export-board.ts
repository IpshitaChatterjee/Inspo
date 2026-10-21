import { getFontEmbedCSS, toPng } from "html-to-image"

async function asDataUrl(url: string) {
  const blob = await (await fetch(url)).blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Google Fonts come from another site, which the image library can't read on
// its own, so their files are fetched here and written into the image.
async function googleFontCSS(fonts: { family: string; weight: number }[]) {
  const sheets = await Promise.all(
    fonts.map(async (font) => {
      const res = await fetch(
        `https://fonts.googleapis.com/css2?family=${font.family.replace(/ /g, "+")}:wght@${font.weight}&display=swap`
      )
      let css = await res.text()
      for (const [, url] of css.matchAll(/url\((https:[^)]+)\)/g))
        css = css.replace(url, await asDataUrl(url))
      return css
    })
  )
  return sheets.join("\n")
}

/** Saves the board as a PNG at twice its on-screen size. */
export async function exportBoard(
  node: HTMLElement,
  name: string,
  fonts: { family: string; weight: number }[]
) {
  const [own, google] = await Promise.all([
    getFontEmbedCSS(node).catch(() => ""),
    googleFontCSS(fonts).catch(() => ""),
  ])
  const png = await toPng(node, {
    pixelRatio: 2,
    fontEmbedCSS: `${own}\n${google}`,
  })
  const link = document.createElement("a")
  link.href = png
  link.download = `${name.replace(/[\\/:*?"<>|]/g, "").trim() || "Moodboard"}.png`
  link.click()
}
