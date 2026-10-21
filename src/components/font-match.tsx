import * as React from "react"
import { ArrowUpRightIcon } from "lucide-react"

const loaded = new Set<string>()

/** Pulls a Google Font into the page once, so its name can be shown in itself. */
export function useGoogleFont(family: string, weight: number) {
  React.useEffect(() => {
    const key = `${family}:${weight}`
    if (loaded.has(key)) return
    loaded.add(key)
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&display=swap`
    document.head.appendChild(link)
  }, [family, weight])
}

const specimen = (family: string) =>
  `https://fonts.google.com/specimen/${family.replace(/ /g, "+")}`

/** The closest free look-alike to the image's headline, plus two runners-up. */
export function FontMatch({
  fonts,
}: {
  fonts: { family: string; weight: number }[]
}) {
  const [best, ...others] = fonts
  useGoogleFont(best.family, best.weight)
  return (
    <div className="flex flex-col gap-1.5">
      <a
        href={specimen(best.family)}
        target="_blank"
        rel="noreferrer"
        title="Open on Google Fonts"
        className="group/font flex items-baseline justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 transition-colors hover:bg-muted"
      >
        <span
          className="truncate text-xl leading-tight"
          style={{ fontFamily: `"${best.family}"`, fontWeight: best.weight }}
        >
          {best.family}
        </span>
        <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/font:text-foreground" />
      </a>
      {others.length > 0 && (
        <span className="text-xs text-muted-foreground">
          Also close:{" "}
          {others.map((font, i) => (
            <React.Fragment key={font.family}>
              {i > 0 && ", "}
              <a
                href={specimen(font.family)}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:text-foreground hover:underline"
              >
                {font.family}
              </a>
            </React.Fragment>
          ))}
        </span>
      )}
    </div>
  )
}
