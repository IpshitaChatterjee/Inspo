import * as React from "react"
import { HashIcon, SearchIcon, SparklesIcon, XIcon } from "lucide-react"
import { cn } from "cn"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { suggestTags, type TagCount } from "@/lib/tags"

/**
 * Search, and the only way to reach a tag: matching tags are suggested as you
 * type, and picking one shows it as a chip in the field.
 */
export function SearchBox({
  inputRef,
  query,
  onQuery,
  tags,
  activeTag,
  onTag,
  placeholder,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  query: string
  onQuery: (query: string) => void
  tags: TagCount[]
  activeTag: string | null
  onTag: (tag: string | null) => void
  placeholder: string
}) {
  const [focused, setFocused] = React.useState(false)
  const [highlight, setHighlight] = React.useState(0)
  const suggestions = suggestTags(tags, query, {
    except: activeTag ?? undefined,
  })
  const showSuggestions = focused && suggestions.length > 0
  const listId = React.useId()

  const pick = (tag: TagCount) => {
    onTag(tag.name)
    // The picked tag replaces the word it was suggested for.
    onQuery(query.trim().split(/\s+/).slice(0, -1).join(" "))
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (showSuggestions && e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (showSuggestions && e.key === "Enter") {
      e.preventDefault()
      pick(suggestions[highlight])
    } else if (e.key === "Backspace" && !query && activeTag) {
      onTag(null)
    } else if (e.key === "Escape") {
      onQuery("")
      e.currentTarget.blur()
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <InputGroup className="h-9 rounded-full bg-muted/60 shadow-none">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        {activeTag && (
          <InputGroupAddon className="pl-0">
            <span className="flex h-6 items-center gap-0.5 rounded-full bg-background pr-0.5 pl-2 text-xs font-medium text-foreground ring-1 ring-border">
              #{activeTag}
              <button
                type="button"
                aria-label={`Stop filtering by ${activeTag}`}
                onClick={() => {
                  onTag(null)
                  inputRef.current?.focus()
                }}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          </InputGroupAddon>
        )}
        <InputGroupInput
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setHighlight(0)
            onQuery(e.target.value)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={activeTag ? "Search within this tag…" : placeholder}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        <InputGroupAddon align="inline-end">
          <Kbd>/</Kbd>
        </InputGroupAddon>
      </InputGroup>

      {showSuggestions && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Tags"
          className="absolute top-full right-0 left-0 z-40 mt-1.5 overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-border"
        >
          <li className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
            Tags
          </li>
          {suggestions.map((tag, index) => (
            <li
              key={tag.name}
              role="option"
              aria-selected={index === highlight}
              // Keep focus in the field, so the list doesn't close before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => pick(tag)}
              className={cn(
                "flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm [&_svg]:size-3.5 [&_svg]:shrink-0",
                index === highlight && "bg-accent text-accent-foreground",
                !tag.mine && "text-muted-foreground"
              )}
            >
              {tag.mine ? <HashIcon /> : <SparklesIcon />}
              <span className="truncate">{tag.name}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {tag.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
