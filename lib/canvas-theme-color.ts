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

export function resolvedCanvasThemeFromDocument(
  root: { classList: { contains: (token: string) => boolean } } = document.documentElement,
): CanvasTheme {
  return root.classList.contains("dark") ? "dark" : "light";
}

function isCanonicalThemeColorMeta(
  meta: Element,
  color: string,
): boolean {
  return (
    meta.getAttribute("content") === color &&
    !meta.hasAttribute("media")
  );
}

/**
 * Point `theme-color` at the resolved canvas so iOS Safari status-bar
 * chrome follows the class-based theme (not only prefers-color-scheme).
 *
 * Safari often ignores in-place `content` updates. Replace the node.
 */
export function syncDocumentThemeColor(theme: CanvasTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  const color = canvasThemeColor(theme);
  const metas = [
    ...document.querySelectorAll('meta[name="theme-color"]'),
  ];

  if (
    metas.length === 1 &&
    isCanonicalThemeColorMeta(metas[0], color)
  ) {
    return;
  }

  metas.forEach((meta) => {
    meta.remove();
  });

  const meta = document.createElement("meta");
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", color);
  document.head.appendChild(meta);
}

/**
 * Keep chrome in sync whenever `html` class flips or Next.js re-injects
 * media-query `theme-color` metas. Mount this at the document root so it
 * does not depend on ThemeProvider effects having run.
 */
export function observeDocumentThemeColor(
  onSync?: (theme: CanvasTheme) => void,
): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const run = () => {
    const theme = resolvedCanvasThemeFromDocument();
    syncDocumentThemeColor(theme);
    onSync?.(theme);
  };

  run();

  const htmlObserver = new MutationObserver(run);
  htmlObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  const headObserver = new MutationObserver((mutations) => {
    const touchesThemeColor = mutations.some((mutation) => {
      if (
        mutation.target instanceof HTMLMetaElement &&
        mutation.target.getAttribute("name") === "theme-color"
      ) {
        return !isCanonicalThemeColorMeta(
          mutation.target,
          canvasThemeColor(resolvedCanvasThemeFromDocument()),
        );
      }

      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return nodes.some(
        (node) =>
          node instanceof HTMLMetaElement &&
          node.getAttribute("name") === "theme-color" &&
          !isCanonicalThemeColorMeta(
            node,
            canvasThemeColor(resolvedCanvasThemeFromDocument()),
          ),
      );
    });

    if (touchesThemeColor) {
      run();
    }
  });

  headObserver.observe(document.head, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["content", "media", "name"],
  });

  return () => {
    htmlObserver.disconnect();
    headObserver.disconnect();
  };
}
