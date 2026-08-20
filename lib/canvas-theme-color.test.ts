import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { OG_COLORS } from "./og/tokens";
import { CANVAS_THEME_COLOR } from "./canvas-theme-color";

describe("canvas theme-color tokens", () => {
  it("uses the landing oklch canvas, not pure black", () => {
    expect(CANVAS_THEME_COLOR.light).toBe("#f5f5f5");
    expect(CANVAS_THEME_COLOR.dark).toBe("#0f0f0f");
    expect(CANVAS_THEME_COLOR.dark).toBe(OG_COLORS.background);
  });
});

describe("static Safari chrome", () => {
  it("leaves both media theme-color metas in place and does not rewrite them in JS", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    const provider = readFileSync("context/theme-provider.tsx", "utf8");

    expect(layout).toContain('media: "(prefers-color-scheme: light)"');
    expect(layout).toContain('media: "(prefers-color-scheme: dark)"');
    expect(layout).toContain("CANVAS_THEME_COLOR.light");
    expect(layout).toContain("CANVAS_THEME_COLOR.dark");
    expect(layout).toContain('colorScheme: "light dark"');
    expect(layout).not.toContain("ThemeColorSync");
    expect(layout).not.toContain('meta[name="theme-color"]');
    expect(provider).not.toContain("syncDocumentThemeColor");
    expect(provider).not.toContain("colorScheme");
  });

  it("does not paint the landing canvas sampler over the dashboard navbar", () => {
    const layout = readFileSync("app/[locale]/dashboard/layout.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");
    const navbar = readFileSync(
      "app/[locale]/dashboard/components/navbar.tsx",
      "utf8",
    );

    expect(layout).toContain("safariThemeSampler={false}");
    expect(navbar).toContain("h-14");
    expect(css).toContain(
      "--navbar-height: calc(3.5rem + env(safe-area-inset-top, 0px))",
    );
    expect(css).not.toContain(
      "--navbar-height: calc(4rem + env(safe-area-inset-top, 0px))",
    );
  });

  it("paints the marketing header with the landing canvas, not bg-background", () => {
    const source = readFileSync(
      "app/[locale]/(landing)/components/navbar.tsx",
      "utf8",
    );

    expect(source).toContain("bg-[oklch(0.97_0_0)]");
    expect(source).toContain("dark:bg-[oklch(0.17_0_0)]");
    expect(source).not.toMatch(
      /fixed top-0 left-0 right-0 z-50 bg-background pt-safe/,
    );
  });
});
