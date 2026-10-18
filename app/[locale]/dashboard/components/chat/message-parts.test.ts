import { describe, expect, it } from "vitest";

import { getToolPhase } from "@/components/ai-elements/tool";
import {
  CONFIRMATION_APPROVED,
  CONFIRMATION_DENIED,
  countFailedSteps,
  isAwaitingStep,
  isConfirmationApproved,
  segmentAssistantParts,
  type ChatPart,
} from "./message-parts";

const tool = (name: string, state: string, extra: Partial<ChatPart> = {}) => ({
  type: `tool-${name}`,
  toolCallId: `${name}-call`,
  state,
  input: {},
  ...extra,
});

describe("segmentAssistantParts", () => {
  it("groups consecutive reasoning and tool parts into one steps segment", () => {
    const segments = segmentAssistantParts([
      { type: "step-start" },
      { type: "reasoning", text: "Checking the week.", state: "done" },
      tool("getCurrentWeekSummary", "output-available"),
      { type: "step-start" },
      tool("getTradesSummary", "output-available"),
      { type: "step-start" },
      { type: "text", text: "Here is your week." },
    ]);

    expect(segments.map((segment) => segment.kind)).toEqual(["steps", "part"]);
    expect(segments[0].kind === "steps" && segments[0].steps).toHaveLength(3);
  });

  it("keeps the equity chart and confirmations out of step groups", () => {
    const segments = segmentAssistantParts([
      tool("getTradesSummary", "output-available"),
      tool("generateEquityChart", "output-available"),
      tool("getJournalEntries", "output-available"),
      tool("askForConfirmation", "input-available"),
    ]);

    expect(
      segments.map((segment) =>
        segment.kind === "steps" ? "steps" : segment.part.type
      )
    ).toEqual([
      "steps",
      "tool-generateEquityChart",
      "steps",
      "tool-askForConfirmation",
    ]);
  });

  it("splits step groups around text so the turn keeps its order", () => {
    const segments = segmentAssistantParts([
      { type: "text", text: "Let me look." },
      tool("getTradesSummary", "output-available"),
      { type: "text", text: "Done." },
    ]);

    expect(segments.map((segment) => segment.kind)).toEqual([
      "part",
      "steps",
      "part",
    ]);
  });

  it("drops empty reasoning once it has finished, but keeps it while thinking", () => {
    const empty = { type: "reasoning", text: "", state: "streaming" };

    expect(segmentAssistantParts([empty])).toEqual([]);
    expect(segmentAssistantParts([empty], { streaming: true })).toHaveLength(1);
    expect(
      segmentAssistantParts([{ type: "reasoning", text: "", state: "done" }], {
        streaming: true,
      })
    ).toEqual([]);
  });
});

describe("getToolPhase", () => {
  it("maps tool part states to the phase each line shows", () => {
    expect(getToolPhase("input-streaming", { streaming: true })).toBe("running");
    expect(getToolPhase("input-available", { streaming: true })).toBe("running");
    expect(getToolPhase("input-available")).toBe("error");
    expect(getToolPhase("output-available")).toBe("done");
    expect(getToolPhase("output-error")).toBe("error");
    expect(getToolPhase("output-denied")).toBe("denied");
    expect(getToolPhase("approval-requested")).toBe("pending");
    expect(getToolPhase("approval-responded", { approved: false })).toBe(
      "denied"
    );
    expect(getToolPhase("result")).toBe("done");
  });
});

describe("countFailedSteps", () => {
  it("counts failed tools and calls left unfinished after the chat stopped", () => {
    const steps = [
      tool("getTradesSummary", "output-error"),
      tool("getJournalEntries", "input-available"),
      tool("getFinancialNews", "output-available"),
    ].map((part, index) => ({ part, index }));

    expect(countFailedSteps(steps)).toBe(2);
    expect(countFailedSteps(steps, { streaming: true })).toBe(1);
  });
});

describe("isAwaitingStep", () => {
  it("shows the thinking line before anything streams", () => {
    expect(isAwaitingStep({ role: "user", parts: [] }, true)).toBe(true);
    expect(
      isAwaitingStep({ role: "assistant", parts: [{ type: "step-start" }] }, true)
    ).toBe(true);
    expect(isAwaitingStep({ role: "user", parts: [] }, false)).toBe(false);
  });

  it("leaves a running step summary to show progress on its own", () => {
    expect(
      isAwaitingStep(
        {
          role: "assistant",
          parts: [tool("getTradesSummary", "output-available"), { type: "step-start" }],
        },
        true
      )
    ).toBe(false);
    expect(
      isAwaitingStep(
        {
          role: "assistant",
          parts: [{ type: "text", text: "Let me check." }, { type: "step-start" }],
        },
        true
      )
    ).toBe(true);
  });
});

describe("isConfirmationApproved", () => {
  it("reads the outputs the confirmation buttons send", () => {
    expect(isConfirmationApproved(CONFIRMATION_APPROVED)).toBe(true);
    expect(isConfirmationApproved(CONFIRMATION_DENIED)).toBe(false);
  });
});
