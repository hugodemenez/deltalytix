// Design tokens for generated OG images. Satori inline styles cannot use CSS
// variables or Tailwind, so we centralize literals here for consistency.
//
// Hex values are sRGB approximations of the landing-page *dark* oklch tokens
// from `.cursor/skills/deltalytix-styling-guidelines/SKILL.md`.
// OG images cannot be theme-responsive — crawlers fetch one cached URL.

export const OG_COLORS = {
  /** Dark landing shell: oklch(0.17 0 0) */
  background: "#0f0f0f",
  /** Dark landing text: oklch(0.93 0 0) */
  foreground: "#e8e8e8",
  /** Secondary body ≈ text-white/55 */
  muted: "rgba(232, 232, 232, 0.55)",
  /** Meta / footer ≈ text-white/45 */
  subtle: "rgba(232, 232, 232, 0.45)",
  /** Dark primary CTA: oklch(0.94 0.01 95) */
  cta: "#edebe4",
  ctaText: "#0f0f0f",
  /** Soft mint wash (same hue as hero demo frame) */
  wash: "#c0e0d1",
  /** Hairline borders: border-white/10 */
  hairline: "rgba(255, 255, 255, 0.1)",
  /** Panel surface on dark shell */
  surface: "#161616",
  /** Chart win / loss — hsl(173 60% 55%) / hsl(12 75% 65%) from globals dark */
  chartWin: "#3dccb0",
  chartLoss: "#f08a6c",
  /** Neutral bar for quiet days */
  chartNeutral: "rgba(232, 232, 232, 0.18)",
} as const;

export const OG_TRACKING = {
  display: "-0.04em",
  tight: "-0.03em",
  snug: "-0.01em",
  wide: "0.01em",
} as const;

/** Canvas edge padding in px */
export const OG_PADDING = 72;

/** Matches landing `rounded-sm` (~4px) */
export const OG_RADIUS = {
  sm: 4,
  md: 8,
} as const;

export const OG_FONT_FAMILY =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
