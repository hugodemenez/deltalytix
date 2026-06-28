import { describe, expect, it } from "vitest";
import { enUS, fr } from "date-fns/locale";
import { formatDateOnly } from "./format-date-only";

describe("formatDateOnly", () => {
  it("formats YYYY-MM-DD without shifting the calendar day", () => {
    expect(
      formatDateOnly("2026-01-25", "MMMM d, yyyy", { locale: enUS })
    ).toBe("January 25, 2026");
    expect(
      formatDateOnly("2026-01-25", "d MMMM yyyy", { locale: fr })
    ).toBe("25 janvier 2026");
  });

  it("ignores time portions on ISO strings", () => {
    expect(formatDateOnly("2026-06-24T00:00:00.000Z", "MMMM d, yyyy")).toBe(
      "June 24, 2026"
    );
  });
});
