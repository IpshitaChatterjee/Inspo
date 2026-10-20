import * as React from "react"
import { ImageUpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import type { Control, ControlValue, Values } from "@/library/types"

type ComponentControlsProps = {
  controls: Control[]
  values: Values
  onChange: (key: string, value: ControlValue) => void
}

// The knobs for an opened component. Every change shows in the preview at once.
export function ComponentControls({
  controls,
  values,
  onChange,
}: ComponentControlsProps) {
  return (
    <div className="flex flex-col gap-5">
      {controls.map((control) => (
        <ControlRow
          key={control.key}
          control={control}
          value={values[control.key] ?? control.default}
          onChange={(value) => onChange(control.key, value)}
        />
      ))}
    </div>
  )
}

type RowProps<T extends Control["type"]> = {
  control: Extract<Control, { type: T }>
  labelId: string
}

function ControlRow({
  control,
  value,
  onChange,
}: {
  control: Control
  value: ControlValue
  onChange: (value: ControlValue) => void
}) {
  const labelId = React.useId()
  const label = (
    <span id={labelId} className="text-sm">
      {control.label}
    </span>
  )

  switch (control.type) {
    case "slider": {
      const n = Number(value)
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {label}
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatNumber(n, control.step)}
              {control.unit}
            </span>
          </div>
          <Slider
            aria-labelledby={labelId}
            min={control.min}
            max={control.max}
            step={control.step}
            value={[n]}
            onValueChange={(next) =>
              onChange(Array.isArray(next) ? next[0] : (next as number))
            }
          />
        </div>
      )
    }
    case "toggle":
      return (
        <div className="flex items-center justify-between gap-3">
          {label}
          <Switch
            aria-labelledby={labelId}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      )
    case "color":
      return (
        <div className="flex items-center justify-between gap-3">
          {label}
          <ColorField
            control={control}
            labelId={labelId}
            value={String(value)}
            onChange={onChange}
          />
        </div>
      )
    case "select":
      return (
        <div className="flex flex-col gap-2">
          {label}
          <Select
            items={control.options}
            value={String(value)}
            onValueChange={(next) => next != null && onChange(next)}
          >
            <SelectTrigger aria-labelledby={labelId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {control.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case "text":
      return (
        <div className="flex flex-col gap-2">
          {label}
          <Input
            aria-labelledby={labelId}
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )
    case "image":
      return (
        <div className="flex flex-col gap-2">
          {label}
          <ImageField
            control={control}
            labelId={labelId}
            value={String(value)}
            onChange={onChange}
          />
        </div>
      )
  }
}

// Shows a slider's value with as many decimals as its step, e.g. 0.05 → "0.9".
function formatNumber(n: number, step: number) {
  const decimals = (String(step).split(".")[1] ?? "").length
  return String(Number(n.toFixed(decimals)))
}

const FULL_HEX = /^#?([0-9a-f]{6})$/i
const SHORT_HEX = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i

function toHex(text: string): string | null {
  const full = text.trim().match(FULL_HEX)
  if (full) return `#${full[1].toLowerCase()}`
  const short = text.trim().match(SHORT_HEX)
  if (short)
    return `#${short
      .slice(1)
      .map((c) => c + c)
      .join("")}`.toLowerCase()
  return null
}

// A colour swatch that opens the system picker, beside a hex code you can type.
function ColorField({
  control,
  labelId,
  value,
  onChange,
}: RowProps<"color"> & { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = React.useState(value)
  const [shown, setShown] = React.useState(value)
  // Picking a swatch or Reset changes the colour from outside the text box.
  if (shown !== value) {
    setShown(value)
    setDraft(value)
  }

  // Remember what was typed, so the box doesn't rewrite it mid-word.
  const commit = (hex: string) => {
    setShown(hex)
    onChange(hex)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="relative block size-8 shrink-0 cursor-pointer overflow-hidden rounded-md shadow-xs ring-1 ring-foreground/15 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
        <span className="absolute inset-0" style={{ backgroundColor: value }} />
        <input
          type="color"
          aria-labelledby={labelId}
          value={toHex(value) ?? "#000000"}
          onChange={(e) => {
            setDraft(e.target.value)
            commit(e.target.value)
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <Input
        aria-label={`${control.label} hex code`}
        value={draft}
        spellCheck={false}
        maxLength={7}
        onChange={(e) => {
          setDraft(e.target.value)
          // Short codes like #f00 wait for the box to lose focus, so typing
          // a longer one doesn't get cut short.
          const full = e.target.value.trim().match(FULL_HEX)
          if (full) commit(`#${full[1].toLowerCase()}`)
        }}
        onBlur={() => {
          const hex = toHex(draft)
          if (hex && hex !== value) commit(hex)
          setDraft(hex ?? value)
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-8 w-24 font-mono text-sm uppercase"
      />
    </div>
  )
}

const UPLOAD = "__upload__"

// `url("blob:…"), <gradient>` → the gradient, which shows if the photo doesn't.
function gradientOf(value: string) {
  return value.match(/^url\(.*?\)\s*,\s*(.*)$/s)?.[1] ?? value
}

// A built-in gradient, or a photo of your own with the chosen gradient behind it.
function ImageField({
  control,
  labelId,
  value,
  onChange,
}: RowProps<"image"> & { value: string; onChange: (value: string) => void }) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const hasUpload = value.startsWith("url(")
  const gradient = gradientOf(value)

  // The photo's temporary address is released once it's replaced, a gradient
  // is picked instead, or the view closes.
  const blobUrl = value.match(/^url\("(blob:[^"]+)"\)/)?.[1]
  React.useEffect(() => {
    if (!blobUrl) return
    return () => URL.revokeObjectURL(blobUrl)
  }, [blobUrl])

  const items = [
    ...(hasUpload
      ? [
          {
            value: UPLOAD,
            label: <Option background={value} name="Your image" />,
          },
        ]
      : []),
    ...control.gradients.map((g) => ({
      value: g.value,
      label: <Option background={g.value} name={g.label} />,
    })),
  ]

  return (
    <div className="flex items-center gap-2">
      <Select
        items={items}
        value={hasUpload ? UPLOAD : gradient}
        onValueChange={(next) => next && next !== UPLOAD && onChange(next)}
      >
        <SelectTrigger aria-labelledby={labelId} className="min-w-0 flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <ImageUpIcon />
        Choose file…
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Lets the same file be picked again later.
          e.target.value = ""
          if (!file || !file.type.startsWith("image/")) return
          onChange(`url("${URL.createObjectURL(file)}"), ${gradient}`)
        }}
      />
    </div>
  )
}

function Option({ background, name }: { background: string; name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="size-4 shrink-0 rounded-full bg-cover bg-center ring-1 ring-foreground/10"
        style={{ backgroundImage: background }}
      />
      <span className="truncate">{name}</span>
    </span>
  )
}
