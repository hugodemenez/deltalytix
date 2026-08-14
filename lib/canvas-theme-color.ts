/**
 * sRGB hex of the landing-page canvas tokens in
 * `app/[locale]/(landing)/layout.tsx`.
 *
 * Light:  oklch(0.97 0 0)  == hsl(0 0% 96.1%) == #f5f5f5
 * Dark:   oklch(0.17 0 0)  == #0f0f0f (same as OG_COLORS.background)
 *
 * iOS Safari `theme-color` cannot use oklch / CSS variables. These hex
 * values are the document chrome / status-bar color. Do not use #000 —
 * the dark landing canvas is charcoal, not pure black.
 */
export const CANVAS_THEME_COLOR = {
  light: "#f5f5f5",
  dark: "#0f0f0f",
} as const;

export type CanvasTheme = keyof typeof CANVAS_THEME_COLOR;

export function canvasThemeColor(theme: CanvasTheme): string {
  return CANVAS_THEME_COLOR[theme];
}

/**
 * Point every `theme-color` meta at the resolved canvas so iOS Safari
 * status-bar chrome follows the class-based theme (not only
 * prefers-color-scheme).
 */
export function syncDocumentThemeColor(theme: CanvasTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  const color = canvasThemeColor(theme);
  const metas = document.querySelectorAll('meta[name="theme-color"]');

  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", color);
    document.head.appendChild(meta);
    return;
  }

  metas.forEach((meta) => {
    meta.setAttribute("content", color);
    meta.removeAttribute("media");
  });
}
