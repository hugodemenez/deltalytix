import { describe, expect, it } from "vitest";
import { igApiKeyFingerprint, sanitizeIgApiKey } from "./api-key";

describe("sanitizeIgApiKey", () => {
  it("strips surrounding whitespace and newlines", () => {
    expect(sanitizeIgApiKey("  abc123\n")).toBe("abc123");
  });

  it("removes internal whitespace from a broken paste", () => {
    expect(sanitizeIgApiKey("abcd efgh\tijkl")).toBe("abcdefghijkl");
  });

  it("strips zero-width and BOM characters", () => {
    expect(sanitizeIgApiKey("\uFEFFabc\u200Bdef")).toBe("abcdef");
  });
});

describe("igApiKeyFingerprint", () => {
  it("reports length and last four characters", () => {
    expect(igApiKeyFingerprint("abcdefghij")).toBe("len=10…ghij");
  });

  it("handles empty input", () => {
    expect(igApiKeyFingerprint("   ")).toBe("empty");
  });
});
