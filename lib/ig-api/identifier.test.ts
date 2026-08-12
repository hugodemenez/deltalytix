import { describe, expect, it } from "vitest";
import {
  IG_IDENTIFIER_PATTERN,
  isValidIgIdentifier,
} from "./identifier";

describe("isValidIgIdentifier", () => {
  it("accepts IG usernames that match the API pattern", () => {
    expect(isValidIgIdentifier("Sebastien42")).toBe(true);
    expect(isValidIgIdentifier("user_name-01")).toBe(true);
    expect(isValidIgIdentifier("A")).toBe(true);
    expect(isValidIgIdentifier("a".repeat(30))).toBe(true);
  });

  it("rejects email addresses that work on the IG website", () => {
    expect(isValidIgIdentifier("sebastien@example.com")).toBe(false);
    expect(isValidIgIdentifier("user.name@ig.com")).toBe(false);
  });

  it("rejects empty, too long, or punctuation outside the pattern", () => {
    expect(isValidIgIdentifier("")).toBe(false);
    expect(isValidIgIdentifier("a".repeat(31))).toBe(false);
    expect(isValidIgIdentifier("user name")).toBe(false);
    expect(isValidIgIdentifier("user.name")).toBe(false);
    expect(isValidIgIdentifier("user+tag")).toBe(false);
  });

  it("keeps the exported regex aligned with the helper", () => {
    expect(IG_IDENTIFIER_PATTERN.source).toBe("^[A-Za-z0-9_-]{1,30}$");
  });
});
