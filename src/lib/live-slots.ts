import * as React from "react"

// Browsers only allow a handful of live WebGL drawings at once (about 16 on
// desktop, fewer on phones); past that, the oldest ones go blank. Cards ask for
// a slot while they're on screen and wait their turn when none are free.

const limit = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 767px)").matches
    ? 6
    : 14

let queue: symbol[] = []
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** True while this card may run live. First come, first served. */
export function useLiveSlot(wanted: boolean) {
  const [id] = React.useState(() => Symbol("card"))

  React.useEffect(() => {
    if (!wanted) return
    queue = [...queue, id]
    notify()
    return () => {
      queue = queue.filter((other) => other !== id)
      notify()
    }
  }, [wanted, id])

  return React.useSyncExternalStore(
    subscribe,
    () => wanted && queue.indexOf(id) > -1 && queue.indexOf(id) < limit(),
    () => false
  )
}
