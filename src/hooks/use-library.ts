import * as React from "react"
import { toast } from "sonner"

import {
  api,
  GALLERY,
  GALLERY_WARN_AT,
  galleryFullness,
  type Item,
  type Library,
  type Patch,
  type PublishState,
} from "@/lib/api"
import type { Board, Project } from "@/lib/projects"
import {
  editsFor,
  lock,
  LockedError,
  pendingEdits,
  savedToken,
  sendEdit,
  unlock,
  withComponentEdits,
  withEdits,
} from "@/lib/gallery-edits"

const FRESH_FOR_MS = 2600
const GALLERY_UNDO_MS = 6000

export function useLibrary() {
  const [library, setLibrary] = React.useState<Library | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  // Items that just arrived (from iCloud or a save) get a brief highlight.
  const [fresh, setFresh] = React.useState<Set<string>>(() => new Set())
  const known = React.useRef<Set<string> | null>(null)
  const [publish, setPublish] = React.useState<PublishState | null>(null)
  const warnedFull = React.useRef(false)
  // Gallery editor mode: unlocked when this device has a valid token.
  const [token, setToken] = React.useState<string | null>(() =>
    GALLERY ? savedToken() : null
  )
  const libraryRef = React.useRef<Library | null>(null)
  React.useEffect(() => {
    libraryRef.current = library
  }, [library])

  // Say it once per visit when the shared gallery is getting full.
  React.useEffect(() => {
    if (warnedFull.current || galleryFullness(publish) < GALLERY_WARN_AT) return
    warnedFull.current = true
    toast.warning(
      `Your shared gallery is ${Math.round(galleryFullness(publish) * 100)}% full`,
      {
        description: "It still works, but it's time to plan for more room.",
        duration: 10_000,
      }
    )
  }, [publish])

  const refresh = React.useCallback(async () => {
    try {
      const next = await api.library()
      // In the gallery, show edits the Mac hasn't picked up yet.
      if (GALLERY) {
        const edits = await pendingEdits().catch(() => [])
        next.items = withEdits(next.items, edits)
        next.componentTags = withComponentEdits(next.componentTags ?? {}, edits)
      }
      const previous = known.current
      const ids = new Set(next.items.map((i) => i.id))
      if (previous) {
        const arrived = next.items
          .filter((i) => !previous.has(i.id))
          .map((i) => i.id)
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
      setError(
        GALLERY
          ? "Couldn't load the gallery. Try refreshing."
          : "Can't reach the Inspo app on this Mac. Is it still running?"
      )
    }
  }, [])

  React.useEffect(() => {
    void refresh()
    // The published gallery is a fixed copy; there's nothing live to listen to.
    if (GALLERY) return
    void api
      .publishState()
      .then(setPublish)
      .catch(() => {})
    const events = new EventSource("/api/events")
    events.onmessage = (event) => {
      const message = JSON.parse(event.data) as {
        type: string
        message?: string
        publish?: PublishState
      }
      if (message.type === "changed") void refresh()
      if (message.type === "toast" && message.message)
        toast.success(message.message)
      if (message.type === "publish" && message.publish)
        setPublish(message.publish)
    }
    events.onopen = () => void refresh()
    return () => events.close()
  }, [refresh])

  // Gallery edits: send each one; a stale unlock locks the editor again.
  const sendGalleryEdits = React.useCallback(
    async (edits: Parameters<typeof sendEdit>[1][]) => {
      if (!token) return
      try {
        for (const edit of edits) await sendEdit(token, edit)
      } catch (e) {
        if (e instanceof LockedError) {
          lock()
          setToken(null)
        }
        toast.error((e as Error).message)
        void refresh()
      }
    },
    [token, refresh]
  )

  // ---------- Projects ----------

  const setProjects = React.useCallback(
    (change: (projects: Project[]) => Project[]) =>
      setLibrary(
        (lib) => lib && { ...lib, projects: change(lib.projects ?? []) }
      ),
    []
  )

  // Changes show at once; if the Mac app refuses, the real state comes back.
  const attempt = React.useCallback(
    async <T>(job: () => Promise<T>) => {
      try {
        return await job()
      } catch (e) {
        toast.error((e as Error).message)
        void refresh()
        return null
      }
    },
    [refresh]
  )

  const createProject = React.useCallback(
    async (name: string, items: string[] = []) => {
      const created = await attempt(() => api.createProject(name, items))
      if (created) setProjects((projects) => [created, ...projects])
      return created
    },
    [attempt, setProjects]
  )

  const updateProject = React.useCallback(
    (id: string, patch: { name?: string; archived?: boolean }) => {
      setProjects((projects) =>
        projects.map((p) => (p.id === id ? { ...p, ...patch } : p))
      )
      void attempt(() => api.updateProject(id, patch))
    },
    [attempt, setProjects]
  )

  const changeProjectItems = React.useCallback(
    (id: string, add: string[], remove: string[] = []) => {
      setProjects((projects) =>
        projects.map((p) =>
          p.id === id
            ? {
                ...p,
                items: [
                  ...p.items.filter((item) => !remove.includes(item)),
                  ...add.filter((item) => !p.items.includes(item)),
                ],
              }
            : p
        )
      )
      void attempt(() => api.changeProjectItems(id, add, remove))
    },
    [attempt, setProjects]
  )

  // Board changes come in quick bursts (sliders), so saving waits for a pause.
  const boardTimers = React.useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  )
  const updateBoard = React.useCallback(
    (id: string, board: Partial<Board>) => {
      setProjects((projects) =>
        projects.map((p) => (p.id === id ? { ...p, board } : p))
      )
      clearTimeout(boardTimers.current.get(id))
      boardTimers.current.set(
        id,
        setTimeout(
          () => void attempt(() => api.updateProject(id, { board })),
          500
        )
      )
    },
    [attempt, setProjects]
  )

  const deleteProject = React.useCallback(
    async (project: Project) => {
      setProjects((projects) => projects.filter((p) => p.id !== project.id))
      const removed = await attempt(() => api.deleteProject(project.id))
      if (!removed) return
      toast(`Deleted “${project.name}”`, {
        description: "Its inspos are still in your library.",
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () =>
            void attempt(async () => {
              await api.restoreProject(removed)
              setProjects((projects) => [removed, ...projects])
            }),
        },
      })
    },
    [attempt, setProjects]
  )

  // A component's tags, saved to the iCloud library (or sent as a gallery edit).
  const updateComponentTags = React.useCallback(
    async (slug: string, tags: string[]) => {
      setLibrary(
        (lib) =>
          lib && {
            ...lib,
            componentTags: { ...lib.componentTags, [slug]: tags },
          }
      )
      if (GALLERY) {
        await sendGalleryEdits([
          {
            itemId: `component:${slug}`,
            op: "setComponentTags",
            value: tags.join(","),
          },
        ])
        return
      }
      try {
        await api.setComponentTags(slug, tags)
      } catch (e) {
        toast.error((e as Error).message)
        void refresh()
      }
    },
    [refresh, sendGalleryEdits]
  )

  const update = React.useCallback(
    async (id: string, patch: Patch) => {
      const before = libraryRef.current?.items.find((item) => item.id === id)
      setLibrary(
        (lib) =>
          lib && {
            ...lib,
            items: lib.items.map((item) =>
              item.id === id ? { ...item, ...patch } : item
            ),
          }
      )
      if (GALLERY) {
        if (before) await sendGalleryEdits(editsFor(before, patch))
        return
      }
      try {
        await api.update(id, patch)
      } catch (e) {
        toast.error((e as Error).message)
        void refresh()
      }
    },
    [refresh, sendGalleryEdits]
  )

  const remove = React.useCallback(
    async (item: Item) => {
      setLibrary(
        (lib) =>
          lib && { ...lib, items: lib.items.filter((i) => i.id !== item.id) }
      )
      if (GALLERY) {
        // Held back for a few seconds so Undo is instant and nothing is sent.
        let undone = false
        toast("Deleted", {
          duration: GALLERY_UNDO_MS,
          action: {
            label: "Undo",
            onClick: () => {
              undone = true
              void refresh()
            },
          },
        })
        setTimeout(() => {
          if (!undone)
            void sendGalleryEdits([{ itemId: item.id, op: "delete" }])
        }, GALLERY_UNDO_MS)
        return
      }
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
    [refresh, sendGalleryEdits]
  )

  const publishNow = React.useCallback(async () => {
    try {
      setPublish(await api.publish())
    } catch (e) {
      toast.error((e as Error).message)
    }
  }, [])

  const unlockEditing = React.useCallback(async (password: string) => {
    setToken(await unlock(password))
    toast.success("Editing unlocked on this device")
  }, [])

  const lockEditing = React.useCallback(() => {
    lock()
    setToken(null)
    toast("Editing locked")
  }, [])

  const setEditingPassword = React.useCallback(
    async (password: string | null) => {
      setPublish(await api.setEditingPassword(password))
    },
    []
  )

  return {
    library,
    error,
    fresh,
    refresh,
    update,
    remove,
    publish,
    publishNow,
    canEdit: !GALLERY || !!token,
    updateComponentTags,
    createProject,
    updateProject,
    changeProjectItems,
    updateBoard,
    deleteProject,
    unlockEditing,
    lockEditing,
    setEditingPassword,
  }
}
