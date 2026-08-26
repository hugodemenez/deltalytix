import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const landingDir = path.join(process.cwd(), "app/[locale]/(landing)");
const read = (relative: string) =>
  fs.readFileSync(path.join(landingDir, relative), "utf8");

const pageSource = read("page.tsx");

/**
 * Agent readiness audits read the raw HTML. A `next/dynamic` boundary is a
 * Suspense boundary, and with Cache Components its fallback - not the section -
 * is what lands in the prerendered shell, so any copy behind one is invisible
 * to a crawler that does not run JavaScript. Every landing section that carries
 * copy has to be imported statically.
 */
const SSR_REQUIRED_SECTIONS = [
  "./components/features",
  "./pricing/page",
  "./components/faq",
  "./components/open-source",
] as const;

describe("landing page server-rendered content", () => {
  it("imports every text-bearing section statically", () => {
    for (const sectionModule of SSR_REQUIRED_SECTIONS) {
      expect(
        pageSource,
        `${sectionModule} must be a static import so its copy reaches the raw HTML`,
      ).toMatch(new RegExp(`^import \\w+ from "${sectionModule}";$`, "m"));
    }
  });

  it("wraps no section in a lazy or Suspense boundary", () => {
    expect(pageSource).not.toMatch(/^import .* from "next\/dynamic";$/m);
    expect(pageSource).not.toContain("<Suspense");
  });

  it("keeps the interactive feature previews client-only so the card copy still renders", () => {
    const features = read("components/features.tsx");

    // The previews are mock-ups with no copy. They pull in dependencies that
    // bail out to client-side rendering, which would take the whole page's
    // server-rendered output with them if they were not isolated.
    for (const preview of [
      "./import-feature",
      "./chat-feature",
      "./calendar-preview",
      "./performance-visualization-chart",
    ]) {
      expect(features, `${preview} must stay client-only`).toContain(
        `import("${preview}")`,
      );
    }
    expect(features.match(/ssr: false/g) ?? []).toHaveLength(4);
  });

  it("renders an H1 in copy that is available without JavaScript", () => {
    const hero = read("components/hero.tsx");

    expect(hero).toContain("<h1");
    expect(hero).toContain('t("landing.title")');
  });

  it("keeps a single H1 by demoting the embedded pricing heading", () => {
    const pricing = read("pricing/page.tsx");

    expect(pageSource).toContain("<PricingPage embedded />");
    expect(pricing).toContain('const Heading = embedded ? "h2" : "h1";');
    // Nested <main> elements would be invalid once pricing renders inside the
    // landing page's own <main>.
    expect(pricing).toContain('const Container = embedded ? "div" : "main";');
  });

  it("keeps enough English landing copy for an agent to understand the product", async () => {
    const [{ default: landing }, { default: faq }] = await Promise.all([
      import("@/locales/en/landing"),
      import("@/locales/en/faq"),
    ]);

    expect(landing.landing.title).toBeTruthy();
    expect(landing.landing.description).toBeTruthy();
    expect(landing.landing.features.heading).toBeTruthy();
    expect(faq.faq.heading).toBeTruthy();

    const text = (value: unknown): string =>
      typeof value === "string"
        ? value
        : value && typeof value === "object"
          ? Object.values(value).map(text).join(" ")
          : "";

    // The copy that the statically imported sections put in the raw HTML.
    expect(text(landing.landing.features).length).toBeGreaterThan(500);
    expect(text(faq.faq).length).toBeGreaterThan(500);
  });
});
