import { describe, expect, it, vi, beforeEach } from "vitest";

const generateText = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
  generateText,
}));

import { translateReasoningLabel } from "./translate-reasoning-label";

describe("translateReasoningLabel", () => {
  beforeEach(() => {
    generateText.mockReset();
  });

  it("returns English text without calling the model", async () => {
    await expect(
      translateReasoningLabel({ text: "Searching docs", locale: "en" }),
    ).resolves.toBe("Searching docs");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("asks the nano model to translate into French", async () => {
    generateText.mockResolvedValue({ text: "Recherche dans la documentation" });

    await expect(
      translateReasoningLabel({
        text: "Searching documentation",
        locale: "fr",
      }),
    ).resolves.toBe("Recherche dans la documentation");

    expect(generateText).toHaveBeenCalledOnce();
    const call = generateText.mock.calls[0]?.[0];
    expect(call.model).toBe("openai/gpt-5-nano");
    expect(call.providerOptions?.openai?.reasoningEffort).toBe("none");
    expect(call.prompt).toContain("French");
    expect(call.prompt).toContain("Searching documentation");
  });

  it("falls back to the source text when the model returns empty", async () => {
    generateText.mockResolvedValue({ text: "   " });

    await expect(
      translateReasoningLabel({ text: "Searching docs", locale: "fr" }),
    ).resolves.toBe("Searching docs");
  });
});
