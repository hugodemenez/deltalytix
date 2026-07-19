import { describe, expect, it } from "vitest";

import { resolveAuthEmailLocale } from "./auth-email-locale";

describe("resolveAuthEmailLocale", () => {
  it("keeps French requests in French", () => {
    expect(resolveAuthEmailLocale("fr")).toBe("fr");
  });

  it.each(["en", undefined, null, "de", "FR"])(
    "falls back to English for %s",
    (locale) => {
      expect(resolveAuthEmailLocale(locale)).toBe("en");
    },
  );
});
