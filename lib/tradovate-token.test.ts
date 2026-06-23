import { describe, expect, it } from "vitest";
import { isTradovateTokenExpired } from "./tradovate-token";

describe("isTradovateTokenExpired", () => {
  const now = new Date("2026-06-23T12:00:00.000Z");

  it("treats missing tokens as expired", () => {
    expect(isTradovateTokenExpired(null, now, now)).toBe(true);
  });

  it("treats past expiry as expired even when token is still stored", () => {
    expect(
      isTradovateTokenExpired(
        "token",
        new Date("2026-06-23T11:00:00.000Z"),
        now,
      ),
    ).toBe(true);
  });

  it("treats future expiry as valid", () => {
    expect(
      isTradovateTokenExpired(
        "token",
        new Date("2026-06-23T13:00:00.000Z"),
        now,
      ),
    ).toBe(false);
  });

  it("allows tokens without expiry metadata", () => {
    expect(isTradovateTokenExpired("token", null, now)).toBe(false);
  });
});
