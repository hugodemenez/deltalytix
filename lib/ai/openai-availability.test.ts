import { describe, expect, it } from "vitest";
import {
  AI_UNAVAILABLE_ERROR,
  getOpenAiAvailabilityError,
  isPlaceholderApiKey,
  parseFormatTradesApiError,
} from "./openai-availability";

describe("isPlaceholderApiKey", () => {
  it("treats missing and blank values as placeholders", () => {
    expect(isPlaceholderApiKey(undefined)).toBe(true);
    expect(isPlaceholderApiKey(null)).toBe(true);
    expect(isPlaceholderApiKey("")).toBe(true);
    expect(isPlaceholderApiKey("   ")).toBe(true);
  });

  it("treats the self-host dummy key as a placeholder for either provider", () => {
    expect(isPlaceholderApiKey("dummy")).toBe(true);
    expect(isPlaceholderApiKey("DUMMY", "gateway")).toBe(true);
    expect(isPlaceholderApiKey(" dummy ", "openai")).toBe(true);
    expect(isPlaceholderApiKey("your_openai_api_key_here", "openai")).toBe(true);
    expect(isPlaceholderApiKey("your_ai_gateway_api_key", "gateway")).toBe(true);
    expect(isPlaceholderApiKey("your_gateway_api_key_here", "gateway")).toBe(true);
  });

  it("keeps each provider's sample string off the other list", () => {
    expect(isPlaceholderApiKey("your_openai_api_key_here", "gateway")).toBe(false);
    expect(isPlaceholderApiKey("your_ai_gateway_api_key", "openai")).toBe(false);
    expect(isPlaceholderApiKey("sk-proj-abc123", "openai")).toBe(false);
    expect(isPlaceholderApiKey("gw-live", "gateway")).toBe(false);
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
