import { defineComponent } from "../types"

// Layered soft blobs over a base wash, so they melt together once blurred
// instead of showing bands. The first one matches the default in component.tsx.
const gradients = [
  {
    label: "Sky meadow",
    value:
      "radial-gradient(120% 45% at 50% 0%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%), radial-gradient(28% 16% at 22% 30%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%), radial-gradient(34% 14% at 76% 24%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%), radial-gradient(70% 34% at 28% 100%, rgba(226,192,92,0.9) 0%, rgba(226,192,92,0) 70%), radial-gradient(50% 30% at 88% 96%, rgba(212,178,78,0.75) 0%, rgba(212,178,78,0) 70%), linear-gradient(180deg, #f5f8fb 0%, #c4ddf2 16%, #8fc0ea 36%, #a6cde0 50%, #98c487 64%, #78ab62 80%, #a9ab55 100%)",
  },
  {
    label: "Dusk",
    value:
      "radial-gradient(80% 40% at 50% 0%, rgba(255,236,222,0.9) 0%, rgba(255,236,222,0) 70%), radial-gradient(40% 30% at 18% 55%, rgba(240,150,170,0.7) 0%, rgba(240,150,170,0) 70%), radial-gradient(45% 30% at 82% 45%, rgba(196,170,232,0.75) 0%, rgba(196,170,232,0) 70%), radial-gradient(70% 40% at 50% 100%, rgba(150,130,210,0.85) 0%, rgba(150,130,210,0) 70%), linear-gradient(180deg, #ffe3cf 0%, #fbc2a6 28%, #ec9fae 55%, #b99ad8 80%, #9a8acb 100%)",
  },
  {
    label: "Mint",
    value:
      "radial-gradient(100% 45% at 50% 0%, rgba(250,255,252,0.95) 0%, rgba(250,255,252,0) 70%), radial-gradient(35% 25% at 78% 35%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%), radial-gradient(50% 35% at 20% 70%, rgba(120,214,190,0.75) 0%, rgba(120,214,190,0) 70%), radial-gradient(70% 40% at 70% 100%, rgba(38,150,150,0.85) 0%, rgba(38,150,150,0) 70%), linear-gradient(180deg, #f4fbf8 0%, #cdeee2 25%, #9fe0c8 50%, #5fc2b0 75%, #2f9c9a 100%)",
  },
]

export default defineComponent({
  slug: "dotted-glass",
  title: "Dotted glass",
  description: "A soft grid of dots over a blurred image or gradient.",
  tags: ["background", "shader"],
  createdAt: "2026-10-20",
  controls: [
    {
      key: "background",
      label: "Background",
      type: "image",
      gradients,
      default: gradients[0].value,
    },
    {
      key: "blur",
      label: "Blur",
      type: "slider",
      min: 0,
      max: 120,
      step: 1,
      default: 40,
      unit: "px",
    },
    {
      key: "dotSize",
      label: "Dot size",
      type: "slider",
      min: 0.5,
      max: 8,
      step: 0.5,
      default: 3,
      unit: "px",
    },
    {
      key: "spacing",
      label: "Spacing",
      type: "slider",
      min: 3,
      max: 40,
      step: 1,
      default: 9,
      unit: "px",
    },
    { key: "dotColor", label: "Dot colour", type: "color", default: "#ffffff" },
    {
      key: "dotOpacity",
      label: "Dot opacity",
      type: "slider",
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.9,
    },
    {
      key: "shape",
      label: "Dot shape",
      type: "select",
      options: [
        { value: "square", label: "Square" },
        { value: "circle", label: "Circle" },
      ],
      default: "square",
    },
    {
      key: "blend",
      label: "Blend",
      type: "select",
      options: [
        { value: "soft-light", label: "Soft light" },
        { value: "overlay", label: "Overlay" },
        { value: "normal", label: "Normal" },
      ],
      default: "soft-light",
    },
    {
      key: "sizeVariation",
      label: "Size variation",
      type: "slider",
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.7,
    },
    {
      key: "patchSize",
      label: "Patch size",
      type: "slider",
      min: 30,
      max: 600,
      step: 10,
      default: 140,
      unit: "px",
    },
    {
      key: "edgeFade",
      label: "Edge fade",
      type: "slider",
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.3,
    },
    {
      key: "fadeFrom",
      label: "Fade from",
      type: "select",
      options: [
        { value: "edges", label: "All edges" },
        { value: "top", label: "Top" },
        { value: "bottom", label: "Bottom" },
        { value: "top-bottom", label: "Top and bottom" },
        { value: "none", label: "No fade" },
      ],
      default: "top",
    },
  ],
  prompt: (v) => {
    const background = String(v.background)
    const builtIn = gradients.find((g) => g.value === background)
    const upload = background.match(/^url\(.*?\)\s*,\s*(.*)$/s)
    const describeBackground = builtIn
      ? `the "${builtIn.label}" gradient, made in CSS: ${background}`
      : upload
        ? `my own photo (I'll put it at /your-image.jpg), with this CSS gradient behind it so something still shows if the photo is missing: ${upload[1]}`
        : `this CSS background: ${background}`
    const percent = Math.round(Number(v.dotOpacity) * 100)
    const dot =
      v.shape === "circle"
        ? `round dots up to ${v.dotSize}px across`
        : `square dots up to ${v.dotSize}px wide`
    const fadeEdges: Record<string, string> = {
      edges: "all four edges",
      top: "the top edge",
      bottom: "the bottom edge",
      "top-bottom": "the top and bottom edges",
    }
    const fade =
      v.fadeFrom === "none" || Number(v.edgeFade) === 0
        ? `No edge fade (fade from: ${v.fadeFrom}, edge fade ${v.edgeFade}).`
        : `Near ${fadeEdges[String(v.fadeFrom)] ?? "the edges"} (fade from: ${v.fadeFrom}) the dots shrink and fade out smoothly; the fade reaches ${Math.round(Number(v.edgeFade) * 100)}% of the way in (edge fade ${v.edgeFade}).`

    return `Build a React component called DottedGlass: a soft, frosted-glass background with a fine grid of dots over it, like a blurred photo seen through an LED panel. It fills its parent and centres whatever I put inside it.

Layers, bottom to top:
1. Background: ${describeBackground}. Size it to cover and centre it, then blur it ${v.blur}px. Make this layer bigger than the frame (about twice the blur past each edge) and clip it with overflow: hidden, so the blurred edges don't show a pale halo.
2. Dots: ${dot}, one every ${v.spacing}px in a regular grid, coloured ${v.dotColor} at ${percent}% opacity (opacity ${v.dotOpacity}), shape ${v.shape}, blend mode ${v.blend} (mix-blend-mode), so they show up more over darker parts of the background. Draw them on a <canvas> (sized to the frame and the screen's pixel ratio, redrawn on resize) so each dot can have its own size. Dot sizes vary in soft, drifting patches about ${v.patchSize}px across, using smooth value noise: size variation ${v.sizeVariation} (0 means every dot is the same size; 1 means the smallest dots shrink away entirely). ${fade}
3. Content: children centred on top, unaffected by the blend.

Expose every value above as a prop with these as the defaults. Keep it to one .tsx file that starts with "use client", imports only from react, and uses inline styles (no Tailwind, no other libraries), so it works in a Next.js or Vite project.`
  },
  demo: (
    <div className="@container w-full px-6">
      <h2 className="mx-auto max-w-[12em] text-center font-serif text-[clamp(1.5rem,8cqw,5.25rem)] leading-[1.04] font-normal tracking-[-0.02em] text-balance text-[#1d2722]">
        Transform the way your team operates
      </h2>
    </div>
  ),
})
