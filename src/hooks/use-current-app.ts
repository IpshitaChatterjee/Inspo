import * as React from "react"

export type AppName = "inspo" | "components"

const KEY = "inspo-current-app"

/** The app you were last in; Inspo when nothing (or nothing usable) is saved. */
export function readSavedApp(
  storage: Pick<Storage, "getItem"> | null
): AppName {
  try {
    const saved = storage?.getItem(KEY)
    return saved === "components" ? "components" : "inspo"
  } catch {
    return "inspo"
  }
}

// Private browsing can block storage, even just looking it up.
function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function useCurrentApp(): [AppName, (app: AppName) => void] {
  const [app, setAppState] = React.useState<AppName>(() =>
    readSavedApp(browserStorage())
  )
  const setApp = React.useCallback((next: AppName) => {
    setAppState(next)
    try {
      browserStorage()?.setItem(KEY, next)
    } catch {
      // Not saved; it just won't be remembered next time.
    }
  }, [])
  return [app, setApp]
}
