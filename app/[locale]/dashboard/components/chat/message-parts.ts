import { getToolPhase } from "@/components/ai-elements/tool";

/** The fields of a UI message part the chat reads, across part types. */
export type ChatPart = {
  type: string;
  state?: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  /** Output of a tool part saved by AI SDK 4. */
  result?: unknown;
  errorText?: string;
  mediaType?: string;
  url?: string;
};

export const CHART_TOOL = "tool-generateEquityChart";
export const CONFIRMATION_TOOL = "tool-askForConfirmation";
export const CONFIRMATION_APPROVED = "Yes, confirmed.";
export const CONFIRMATION_DENIED = "No, denied";

export type IndexedPart = { part: ChatPart; index: number };

export type MessageSegment =
  | { kind: "steps"; key: string; steps: IndexedPart[] }
  | { kind: "part"; key: string; part: ChatPart; index: number };

export const isToolPart = (part: ChatPart) =>
  part.type.startsWith("tool-") || part.type === "dynamic-tool";

export const getToolName = (part: ChatPart): string =>
  part.type === "dynamic-tool" ? (part.toolName ?? "") : part.type.slice(5);

/**
 * The equity chart and the confirmation prompt are what the person came for,
 * so they stay visible instead of folding into a step summary.
 */
const isStep = (part: ChatPart) =>
  part.type === "reasoning" ||
  (isToolPart(part) &&
    part.type !== CHART_TOOL &&
    part.type !== CONFIRMATION_TOOL);

/**
 * Groups consecutive reasoning and tool parts of an assistant message into
 * step segments, so each run of work renders as one summary line. Text, files,
 * the chart and confirmations pass through in order between them.
 */
export function segmentAssistantParts(
  parts: ChatPart[],
  { streaming = false }: { streaming?: boolean } = {}
): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let current: IndexedPart[] | null = null;

  parts.forEach((part, index) => {
    if (part.type === "step-start") {
      return;
    }

    if (part.type === "reasoning") {
      const thinking = streaming && part.state === "streaming";
      // Providers that hide their reasoning still send empty parts.
      if (!part.text?.trim() && !thinking) {
        return;
      }
    }

    if (part.type === "text" && !part.text?.trim()) {
      return;
    }

    if (isStep(part)) {
      if (!current) {
        current = [];
        segments.push({ kind: "steps", key: `steps-${index}`, steps: current });
      }
      current.push({ part, index });
      return;
    }

    current = null;
    segments.push({
      kind: "part",
      key: `${part.type}-${part.toolCallId ?? index}`,
      part,
      index,
    });
  });

  return segments;
}

export function countFailedSteps(
  steps: IndexedPart[],
  { streaming = false }: { streaming?: boolean } = {}
) {
  return steps.filter(
    ({ part }) =>
      isToolPart(part) &&
      getToolPhase(part.state ?? "", { streaming }) === "error"
  ).length;
}

/**
 * Whether the turn is waiting on the model with nothing on screen to show it:
 * the request was just sent, or a new step started after text.
 */
export function isAwaitingStep(
  lastMessage: { role: string; parts?: ChatPart[] } | undefined,
  processing: boolean
) {
  if (!processing || !lastMessage) {
    return false;
  }
  if (lastMessage.role === "user") {
    return true;
  }
  if (lastMessage.role !== "assistant") {
    return false;
  }

  const parts = lastMessage.parts ?? [];
  const segments = segmentAssistantParts(parts, { streaming: true });
  if (segments.length === 0) {
    return true;
  }

  return (
    parts.at(-1)?.type === "step-start" && segments.at(-1)?.kind !== "steps"
  );
}

/** Reads the person's answer from an askForConfirmation output. */
export const isConfirmationApproved = (output: unknown) =>
  output === CONFIRMATION_APPROVED;
