import { describe, expect, it } from "vitest";
import {
  cleanReasoningLabel,
  resolveStableReasoningLabel,
} from "./reasoning-label";

describe("cleanReasoningLabel", () => {
  it("keeps long first lines by truncating instead of dropping them", () => {
    const long =
      "Searching Taurus and DxFeed integration for the user question about imports";
    const label = cleanReasoningLabel(long);

    expect(label).toBeTruthy();
    expect(label.endsWith("…")).toBe(true);
    expect(label.length).toBe(60);
  });

  it("uses only the first line", () => {
    expect(cleanReasoningLabel("Recherche Taurus\nLe reste du raisonnement")).toBe(
      "Recherche Taurus",
    );
  });
});

describe("resolveStableReasoningLabel", () => {
  it("does not flicker to empty when the first line grows past 60 chars", () => {
    const steps = [
      "Search",
      "Searching Taurus and DxFeed integration for the user",
      "Searching Taurus and DxFeed integration for the user question about imports",
      "Searching Taurus and DxFeed integration for the user question about imports\nBody",
    ];

    let locked: string | null = null;
    const labels: string[] = [];

    for (const [index, text] of steps.entries()) {
      const isStreaming = index < steps.length - 1;
      const resolved = resolveStableReasoningLabel({ text, isStreaming, locked });
      locked = resolved.locked;
      labels.push(resolved.label);
    }

    expect(labels.every((label) => label.length > 0)).toBe(true);
    // Once the first line completes (newline), the locked title stays put.
    expect(labels[3]).toBe(labels[2]);
  });
});
