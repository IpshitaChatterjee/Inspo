import {
  BlocksIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AppName } from "@/hooks/use-current-app"

const APPS: { name: AppName; label: string; icon: typeof SparklesIcon }[] = [
  { name: "inspo", label: "Inspo", icon: SparklesIcon },
  { name: "components", label: "Components", icon: BlocksIcon },
]

/** The sidebar's wordmark, which doubles as the switch between the two apps. */
export function AppSwitcher({
  app,
  counts,
  onChange,
  compact = false,
}: {
  app: AppName
  counts: Record<AppName, number>
  onChange: (app: AppName) => void
  /** Icon and arrow only, for the phone header where the sidebar is hidden. */
  compact?: boolean
}) {
  const current = APPS.find((a) => a.name === app) ?? APPS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            aria-label="Switch app"
            className={
              compact ? "h-9 gap-1.5 px-1.5" : "-ml-2 h-auto gap-2 px-2 py-1"
            }
          />
        }
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <current.icon className="size-4" />
        </span>
        {!compact && (
          <span className="font-heading text-lg font-semibold tracking-tight">
            {current.label}
          </span>
        )}
        <ChevronsUpDownIcon className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {APPS.map((a) => (
          <DropdownMenuItem key={a.name} onClick={() => onChange(a.name)}>
            <a.icon />
            {a.label}
            <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
              {counts[a.name]}
              <CheckIcon
                className={a.name === app ? "text-foreground" : "invisible"}
              />
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
