import * as React from "react"
import { LockIcon, LockOpenIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type EditLockProps = {
  unlocked: boolean
  onUnlock: (password: string) => Promise<void>
  onLock: () => void
}

/** The gallery's lock: locked by default; the password unlocks editing on this device. */
export function EditLock({ unlocked, onUnlock, onLock }: EditLockProps) {
  const [open, setOpen] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  if (unlocked) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="rounded-full"
        onClick={onLock}
        title="Lock editing"
      >
        <LockOpenIcon />
        Editing
      </Button>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onUnlock(password)
      setPassword("")
      setOpen(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label="Unlock editing"
        onClick={() => setOpen(true)}
      >
        <LockIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Unlock editing</DialogTitle>
            <DialogDescription>
              Change tags and titles, or delete things, from here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input
              type="password"
              autoFocus
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!password || busy}>
              {busy ? "Checking…" : "Unlock"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
