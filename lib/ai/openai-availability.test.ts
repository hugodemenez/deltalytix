import { describe, expect, it } from "vitest";
import {
  AI_UNAVAILABLE_ERROR,
  getOpenAiAvailabilityError,
  isPlaceholderOpenAiApiKey,
  parseFormatTradesApiError,
} from "./openai-availability";

describe("isPlaceholderOpenAiApiKey", () => {
  it("treats missing and blank values as placeholders", () => {
    expect(isPlaceholderOpenAiApiKey(undefined)).toBe(true);
    expect(isPlaceholderOpenAiApiKey(null)).toBe(true);
    expect(isPlaceholderOpenAiApiKey("")).toBe(true);
    expect(isPlaceholderOpenAiApiKey("   ")).toBe(true);
  });

  it("treats the self-host dummy key as a placeholder", () => {
    expect(isPlaceholderOpenAiApiKey("dummy")).toBe(true);
    expect(isPlaceholderOpenAiApiKey("DUMMY")).toBe(true);
    expect(isPlaceholderOpenAiApiKey(" dummy ")).toBe(true);
    expect(isPlaceholderOpenAiApiKey("your_openai_api_key_here")).toBe(true);
  });

  it("accepts a configured key", () => {
    expect(isPlaceholderOpenAiApiKey("sk-proj-abc123")).toBe(false);
    expect(isPlaceholderOpenAiApiKey("gateway-key")).toBe(false);
  });
});

describe("getOpenAiAvailabilityError", () => {
  it("returns AI_UNAVAILABLE for the self-host dummy key", () => {
    expect(getOpenAiAvailabilityError("dummy")).toEqual({
      error: AI_UNAVAILABLE_ERROR,
    });
  });

  it("returns null when a key is configured", () => {
    expect(getOpenAiAvailabilityError("sk-proj-abc123")).toBeNull();
  });
});

describe("parseFormatTradesApiError", () => {
  it("reads the error code from a JSON body", () => {
    expect(
      parseFormatTradesApiError(JSON.stringify({ error: AI_UNAVAILABLE_ERROR })),
    ).toEqual({ code: AI_UNAVAILABLE_ERROR });
  });

  it("returns a null code for non-JSON bodies", () => {
    expect(parseFormatTradesApiError("Failed to fetch the response.")).toEqual({
      code: null,
    });
  });
});
