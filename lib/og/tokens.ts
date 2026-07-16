// Design tokens for generated OG images. Satori inline styles cannot use CSS
// variables or Tailwind, so we centralize literals here for consistency.
//
// Hex values are sRGB approximations of the landing-page oklch tokens from
// `.cursor/skills/deltalytix-styling-guidelines/SKILL.md` and the hero.

export const OG_COLORS = {
  /** Landing shell: oklch(0.97 0 0) */
  background: "#f5f5f5",
  /** Landing text: oklch(0.17 0 0) */
  foreground: "#0f0f0f",
  /** Secondary body ≈ text-black/55 on the light shell */
  muted: "rgba(15, 15, 15, 0.55)",
  /** Meta / footer ≈ text-black/45 */
  subtle: "rgba(15, 15, 15, 0.45)",
  /** Primary CTA fill: oklch(0.22 0.01 95) */
  cta: "#1c1b15",
  ctaText: "#ffffff",
  /** Hero demo-frame wash: oklch(0.88 0.04 165) */
  wash: "#c0e0d1",
  /** Hairline borders: border-black/10 */
  hairline: "rgba(0, 0, 0, 0.1)",
  /** Soft panel surface for product-frame accents */
  surface: "#ffffff",
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
