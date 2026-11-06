import { defineComponent } from "../types"

export default defineComponent({
  slug: "twist-grid",
  title: "Twist grid",
  description:
    "A grid of boxes turned edge-on that twist to face your pointer in a starburst.",
  tags: ["hover", "grid", "3d"],
  createdAt: "2026-11-06",
  controls: [
    { key: "boxColor", label: "Box colour", type: "color", default: "#c6ff0c" },
    {
      key: "backgroundColor",
      label: "Background",
      type: "color",
      default: "#144b3d",
    },
    {
      key: "boxSize",
      label: "Box size",
      type: "slider",
      min: 12,
      max: 120,
      step: 1,
      default: 38,
      unit: "px",
    },
    {
      key: "gap",
      label: "Gap",
      type: "slider",
      min: 0,
      max: 24,
      step: 1,
      default: 1,
      unit: "px",
    },
    {
      key: "cornerRadius",
      label: "Corner rounding",
      type: "slider",
      min: 0,
      max: 30,
      step: 1,
      default: 0,
      unit: "px",
    },
    {
      key: "twist",
      label: "Twist",
      type: "slider",
      min: 0,
      max: 90,
      step: 1,
      default: 86,
      unit: "°",
    },
    {
      key: "restTurn",
      label: "Turn at rest",
      type: "slider",
      min: 0,
      max: 90,
      step: 1,
      default: 84,
      unit: "°",
    },
    {
      key: "depth",
      label: "Depth",
      type: "slider",
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.3,
    },
    {
      key: "speed",
      label: "Speed",
      type: "slider",
      min: 2,
      max: 40,
      step: 1,
      default: 14,
    },
  ],
  presets: [
    {
      name: "Lime",
      values: { boxColor: "#c6ff0c", backgroundColor: "#144b3d" },
    },
    {
      name: "Ink",
      values: { boxColor: "#f4f1ea", backgroundColor: "#16161a" },
    },
    {
      name: "Coral",
      values: { boxColor: "#ff6b4a", backgroundColor: "#2a1a3d" },
    },
  ],
  prompt: (v) => {
    const depth = Number(v.depth)
    const perspective =
      depth > 0
        ? `Give each box its own perspective of (box size × 2 ÷ depth) px, so with depth ${v.depth} that's ${Math.round((Number(v.boxSize) * 2) / depth)}px, and half-turned boxes look like tapered wedges.`
        : `No perspective (depth ${v.depth}), so turned boxes just look squashed.`
    return `Build a React component called TwistGrid: a grid of square boxes that react to the pointer in 3D. It fills its parent.

Look:
- Background ${v.backgroundColor}, boxes ${v.boxColor}, each box ${v.boxSize}px square with ${v.gap}px between boxes and ${v.cornerRadius}px rounded corners.
- The grid covers the whole frame (one extra row and column, centred, clipped with overflow: hidden), and is rebuilt when the frame resizes (ResizeObserver).
- ${perspective}

Behaviour:
- At rest (no pointer over it), every box is turned ${v.restTurn}° around its vertical axis (rotateY), so the grid reads as thin vertical stripes, like blinds seen edge-on. 0° would be a flat grid of squares.
- On hover, each box turns around the line that points from the box's centre to the pointer (rotate3d with axis cos(a), sin(a), 0, where a = atan2(dy, dx) from pointer to box). The amount is ${v.twist}° × sin(2a): zero for boxes in the pointer's row and column, which lie flat and form a bright cross, and the most for boxes on the diagonals, which stay as thin slivers pointing at the pointer. The result is a starburst centred on the pointer.
- Blend between the two with a hover amount h from 0 to 1: transform = perspective · rotate3d(axis, twist × sin(2a) × h) · rotateY(rest turn × (1 − h)).
- Both the pointer position and h ease towards their targets every frame with 1 − exp(−dt × ${v.speed}) (speed ${v.speed}): it follows the pointer closely and settles smoothly with no bounce. When the pointer enters from rest, jump the eased position straight to it so the starburst starts under the pointer. On leave, h eases back to 0 and the boxes return to stripes.
- Update the boxes' transforms directly in a requestAnimationFrame loop (not through React state), and stop the loop once everything has settled.

Expose every value above as a prop with these as the defaults. Keep it to one .tsx file that starts with "use client", imports only from react, and uses inline styles (no Tailwind, no other libraries), so it works in a Next.js or Vite project.`
  },
})
