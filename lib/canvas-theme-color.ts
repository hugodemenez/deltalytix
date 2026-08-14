/**
 * sRGB hex of the landing canvas in `app/[locale]/(landing)/layout.tsx`.
 * Used only for the static iOS `theme-color` metas — same pattern as a
 * simple site: one light meta, one dark meta, no JS rewrites.
 *
 * Light: oklch(0.97 0 0) == #f5f5f5
 * Dark:  oklch(0.17 0 0) == #0f0f0f
 */
export const CANVAS_THEME_COLOR = {
  light: "#f5f5f5",
  dark: "#0f0f0f",
} as const;
