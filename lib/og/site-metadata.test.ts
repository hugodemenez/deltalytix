import { describe, expect, it } from "vitest";
import {
  getSiteMetadataCopy,
  SOCIAL_DESCRIPTION_MAX_LENGTH,
  truncateForSocialDescription,
} from "./site-metadata";

describe("site metadata copy", () => {
  it("returns English copy with SEO-friendly title and description lengths", () => {
    const copy = getSiteMetadataCopy("en");

    expect(copy.title.length).toBeGreaterThanOrEqual(50);
    expect(copy.title.length).toBeLessThanOrEqual(70);
    expect(copy.description.length).toBeLessThanOrEqual(SOCIAL_DESCRIPTION_MAX_LENGTH);
    expect(copy.ogCta).toContain("→");
  });

  it("returns French copy with SEO-friendly description length", () => {
    const copy = getSiteMetadataCopy("fr");

    expect(copy.description.length).toBeLessThanOrEqual(SOCIAL_DESCRIPTION_MAX_LENGTH);
    expect(copy.ogCta).toContain("→");
  });
});

describe("truncateForSocialDescription", () => {
  it("keeps short descriptions unchanged", () => {
    const text = "Short description.";
    expect(truncateForSocialDescription(text)).toBe(text);
  });

  it("truncates long descriptions with an ellipsis", () => {
    const text =
      "Centralize and visualize your trading performance across multiple brokers. Track, analyze, and improve your trading journey with powerful analytics.";
    const truncated = truncateForSocialDescription(text);

    expect(truncated.length).toBeLessThanOrEqual(SOCIAL_DESCRIPTION_MAX_LENGTH);
    expect(truncated.endsWith("…")).toBe(true);
  });
});
