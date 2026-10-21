import { motion } from "motion/react"
import { FolderIcon, SparklesIcon } from "lucide-react"
import { cn } from "cn"

import { sameView, type View } from "@/components/app-sidebar"
import type { Project } from "@/lib/projects"
import type { TagCount } from "@/lib/tags"

/** On phones the sidebar is hidden, so projects and tags become a row you swipe through. */
export function MobileTags({
  tags,
  untagged,
  projects = [],
  view,
  onView,
}: {
  tags: TagCount[]
  untagged: number
  projects?: Project[]
  view: View
  onView: (view: View) => void
}) {
  const chips: {
    view: View
    label: string
    auto?: boolean
    project?: boolean
  }[] = [
    { view: { kind: "all" }, label: "Everything" },
    ...projects.map((project) => ({
      view: { kind: "project", id: project.id } as View,
      label: project.name,
      project: true,
    })),
    ...(untagged > 0
      ? [{ view: { kind: "untagged" } as View, label: "Untagged" }]
      : []),
    ...tags.map((tag) => ({
      view: { kind: "tag", name: tag.name } as View,
      label: tag.name,
      auto: !tag.mine,
    })),
  ]
  const isActive = (candidate: View) => sameView(candidate, view)

  return (
    <div className="-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 pb-1 md:hidden">
      {chips.map((chip) => {
        const active = isActive(chip.view)
        return (
          <button
            key={
              chip.project
                ? `project:${chip.view.kind === "project" && chip.view.id}`
                : chip.label
            }
            type="button"
            onClick={() => onView(chip.view)}
            className={cn(
              "relative flex h-8 shrink-0 items-center gap-1 rounded-full px-3.5 text-sm transition-colors",
              active
                ? "text-primary-foreground"
                : chip.auto
                  ? "bg-muted/60 text-muted-foreground"
                  : "bg-muted text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="mobile-tag-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}
            {chip.auto && <SparklesIcon className="relative size-3" />}
            {chip.project && <FolderIcon className="relative size-3.5" />}
            <span className="relative">{chip.label}</span>
          </button>
        )
      })}
    </div>
  )
}
