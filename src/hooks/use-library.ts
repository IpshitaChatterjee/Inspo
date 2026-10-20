import * as React from "react"
import { toast } from "sonner"

import { api, GALLERY, type Item, type Library, type Patch, type PublishState } from "@/lib/api"

const FRESH_FOR_MS = 2600

export function useLibrary() {
  const [library, setLibrary] = React.useState<Library | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  // Items that just arrived (from iCloud or a save) get a brief highlight.
  const [fresh, setFresh] = React.useState<Set<string>>(() => new Set())
  const known = React.useRef<Set<string> | null>(null)
  const [publish, setPublish] = React.useState<PublishState | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      const next = await api.library()
      const previous = known.current
      const ids = new Set(next.items.map((i) => i.id))
      if (previous) {
        const arrived = next.items.filter((i) => !previous.has(i.id)).map((i) => i.id)
        if (arrived.length) {
          setFresh((f) => new Set([...f, ...arrived]))
          setTimeout(() => {
            setFresh((f) => {
              const copy = new Set(f)
              arrived.forEach((id) => copy.delete(id))
              return copy
            })
          }, FRESH_FOR_MS)
        }
      }
      known.current = ids
      setLibrary(next)
      setError(null)
    } catch {
      setError(GALLERY ? "Couldn't load the gallery. Try refreshing." : "Can't reach the Inspo app on this Mac. Is it still running?")
    }
  }, [])

  React.useEffect(() => {
    void refresh()
    // The published gallery is a fixed copy; there's nothing live to listen to.
    if (GALLERY) return
    void api.publishState().then(setPublish).catch(() => {})
    const events = new EventSource("/api/events")
    events.onmessage = (event) => {
      const message = JSON.parse(event.data) as { type: string; message?: string; publish?: PublishState }
      if (message.type === "changed") void refresh()
      if (message.type === "toast" && message.message) toast.success(message.message)
      if (message.type === "publish" && message.publish) setPublish(message.publish)
    }
    events.onopen = () => void refresh()
    return () => events.close()
  }, [refresh])

  const update = React.useCallback(
    async (id: string, patch: Patch) => {
      setLibrary((lib) =>
        lib && {
          ...lib,
          items: lib.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        }
      )
      try {
        await api.update(id, patch)
      } catch (e) {
        toast.error((e as Error).message)
        void refresh()
      }
    },
    [refresh]
  )

  const remove = React.useCallback(
    async (item: Item) => {
      setLibrary((lib) => lib && { ...lib, items: lib.items.filter((i) => i.id !== item.id) })
      try {
        const { undoId } = await api.remove(item.id)
        toast(item.kind === "link" ? "Link deleted" : "Deleted", {
          duration: 8000,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await api.restore(undoId)
                toast.success("Restored")
                void refresh()
              } catch (e) {
                toast.error((e as Error).message)
              }
            },
          },
        })
      } catch (e) {
        toast.error((e as Error).message)
        void refresh()
      }
    },
    [refresh]
  )

  const publishNow = React.useCallback(async () => {
    try {
      setPublish(await api.publish())
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [])

  return { library, error, fresh, refresh, update, remove, publish, publishNow }
}
