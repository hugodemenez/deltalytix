import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { OG_COLORS } from "./og/tokens";
import {
  CANVAS_THEME_COLOR,
  canvasThemeColor,
  resolvedCanvasThemeFromDocument,
} from "./canvas-theme-color";

describe("canvas theme-color tokens", () => {
  it("uses the landing oklch canvas, not pure black", () => {
    expect(CANVAS_THEME_COLOR.light).toBe("#f5f5f5");
    expect(CANVAS_THEME_COLOR.dark).toBe("#0f0f0f");
    expect(CANVAS_THEME_COLOR.dark).toBe(OG_COLORS.background);
    expect(CANVAS_THEME_COLOR.light.toLowerCase()).not.toBe("#000");
    expect(CANVAS_THEME_COLOR.light.toLowerCase()).not.toBe("#000000");
    expect(CANVAS_THEME_COLOR.dark.toLowerCase()).not.toBe("#000");
    expect(CANVAS_THEME_COLOR.dark.toLowerCase()).not.toBe("#000000");
  });

  it("resolves light and dark from the shared map", () => {
    expect(canvasThemeColor("light")).toBe(CANVAS_THEME_COLOR.light);
    expect(canvasThemeColor("dark")).toBe(CANVAS_THEME_COLOR.dark);
  });

  it("reads the resolved canvas from the html class", () => {
    expect(
      resolvedCanvasThemeFromDocument({
        classList: { contains: (name: string) => name === "dark" },
      }),
    ).toBe("dark");
    expect(
      resolvedCanvasThemeFromDocument({
        classList: { contains: () => false },
      }),
    ).toBe("light");
  });
});

describe("root layout viewport theme-color", () => {
  it("exports light and dark canvas themeColor (not #000)", () => {
    const source = readFileSync("app/layout.tsx", "utf8");

    expect(source).toContain("themeColor");
    expect(source).toContain("CANVAS_THEME_COLOR.light");
    expect(source).toContain("CANVAS_THEME_COLOR.dark");
    expect(source).toContain('media: "(prefers-color-scheme: light)"');
    expect(source).toContain('media: "(prefers-color-scheme: dark)"');
    expect(source).not.toMatch(/themeColor:\s*["']#000/);
    expect(source).toContain("ThemeColorSync");
    expect(source).toContain("el.remove()");
  });
});

describe("root theme-color listener", () => {
  it("mounts a document-level observer, not only ThemeProvider effects", () => {
    const sync = readFileSync("components/theme-color-sync.tsx", "utf8");
    const provider = readFileSync("context/theme-provider.tsx", "utf8");

    expect(sync).toContain("observeDocumentThemeColor");
    expect(provider).toContain("applyTheme(newTheme)");
    expect(provider).not.toMatch(
      /startTransition\(\s*\(\)\s*=>\s*\{\s*applyTheme/,
    );
  });
});

describe("landing header canvas", () => {
  it("paints the marketing header with --canvas, not bg-background", () => {
    const source = readFileSync(
      "app/[locale]/(landing)/components/navbar.tsx",
      "utf8",
    );

    expect(source).toContain("canvas-bg pt-safe min-h-nav-safe");
    expect(source).toContain("canvas-bg pt-safe text-foreground");
    expect(source).not.toMatch(
      /fixed top-0 left-0 right-0 z-50 bg-background pt-safe/,
    );
  });
});
