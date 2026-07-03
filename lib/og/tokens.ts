// Design tokens for generated OG images. Satori inline styles cannot use CSS
// variables or Tailwind, so we centralize literals here for consistency.

export const OG_COLORS = {
    background: "#000000",
    foreground: "#FFFFFF",
    muted: "#6B7280",
    accent: "#14B8A6",
} as const

export const OG_TRACKING = {
    tight: "-0.025em",
    snug: "-0.01em",
    wide: "0.01em",
} as const

/** Canvas edge padding in px */
export const OG_PADDING = 80
