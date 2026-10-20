// Tags from the caption a post came with (tweet text, a page's description).
// Hashtags are taken as-is; otherwise common design words are recognised and
// folded into one tidy tag each ("animated", "micro-interactions" → motion).

const VOCABULARY: [tag: string, pattern: RegExp][] = [
  ["website", /\b(websites?|web ?sites?|web|homepages?|web ?design)\b/],
  ["landing page", /\blanding ?pages?\b/],
  ["mobile", /\b(mobile|ios|android|iphone|ipad)\b/],
  ["app", /\b(apps?|application)\b/],
  ["dashboard", /\bdashboards?\b/],
  ["component", /\bcomponents?\b/],
  ["design system", /\bdesign ?systems?\b/],
  ["motion", /\b(motion|animat\w*|micro-?interactions?|transitions?|easing)\b/],
  ["interaction", /\binteractions?\b/],
  ["typography", /\b(typograph\w*|typefaces?|fonts?|lettering|type ?design)\b/],
  ["branding", /\b(brand\w*|visual identity|identity design)\b/],
  ["logo", /\blogos?\b/],
  ["illustration", /\billustrat\w*\b/],
  ["icons", /\bicons?\b/],
  ["3d", /\b(3d|three\.?js|blender|spline|c4d|cinema ?4d)\b/],
  ["shader", /\bshaders?\b/],
  ["code", /\b(in code|coded|code|react|css|swiftui|html|javascript)\b/],
  ["figma", /\bfigma\b/],
  ["framer", /\bframer\b/],
  ["onboarding", /\bonboarding\b/],
  ["pricing", /\bpricing\b/],
  ["checkout", /\bcheckout\b/],
  ["navigation", /\b(navigation|nav ?bars?|menus?|sidebars?|tab ?bars?)\b/],
  ["modal", /\b(modals?|dialogs?|popovers?|sheets?)\b/],
  ["form", /\b(forms?|inputs?)\b/],
  ["button", /\bbuttons?\b/],
  ["card", /\bcards?\b/],
  ["table", /\btables?\b/],
  ["data viz", /\b(charts?|graphs?|data ?vi[sz]\w*)\b/],
  ["map", /\bmaps?\b/],
  ["poster", /\bposters?\b/],
  ["packaging", /\bpackaging\b/],
  ["editorial", /\b(editorial|magazine)\b/],
  ["portfolio", /\bportfolios?\b/],
  ["layout", /\b(layouts?|grids?)\b/],
  ["gradient", /\bgradients?\b/],
  ["dark mode", /\bdark ?mode\b/],
  ["glass", /\b(glass\w*|frosted|blur)\b/],
  ["ai", /\b(ai|llm|gpt|claude|agents?)\b/],
  ["prototype", /\bprototyp\w*\b/],
  ["photography", /\bphoto\w*\b/],
  ["e-commerce", /\b(e-?commerce|online store|shop)\b/],
  ["empty state", /\bempty ?states?\b/],
  ["login", /\b(log ?in|sign ?in|sign ?up|auth\w*)\b/],
  ["ui", /\bui\b/],
  ["ux", /\bux\b/],
  ["wireframe", /\bwireframes?\b/],
]

const MAX_TAGS = 6

export function captionTags(caption: string | undefined | null) {
  if (!caption) return []
  // The author ("Name (@handle) — ") and links aren't part of what it's about.
  const text = caption
    .replace(/^.*?\(@\w+\) — /, "")
    .replace(/https?:\/\/\S+/g, "")
    .toLowerCase()

  const tags = new Set<string>()
  for (const [, hashtag] of text.matchAll(/#([\p{L}\p{N}_]{2,24})/gu)) tags.add(hashtag.replace(/_/g, " "))
  for (const [tag, pattern] of VOCABULARY) if (pattern.test(text)) tags.add(tag)
  return [...tags].slice(0, MAX_TAGS)
}
