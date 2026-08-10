const MAX_REASONING_LABEL_LENGTH = 60;

/** First-line title for the reasoning trigger — truncate, never drop to a static fallback. */
export function cleanReasoningLabel(text: string): string {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "";

  const cleaned = firstLine
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/[:.]+$/, "")
    .trim();

  if (!cleaned) return "";
  return cleaned.length > MAX_REASONING_LABEL_LENGTH
    ? `${cleaned.slice(0, MAX_REASONING_LABEL_LENGTH - 1)}…`
    : cleaned;
}

/**
 * Pure helper for tests / SSR: once the first line is complete, keep that title.
 * While the first line is still streaming, return the live partial.
 */
export function resolveStableReasoningLabel(args: {
  text: string;
  isStreaming: boolean;
  locked: string | null;
}): { label: string; locked: string | null } {
  const live = cleanReasoningLabel(args.text);
  const firstLineComplete =
    args.text.includes("\n") || (!args.isStreaming && live.length > 0);

  let locked = args.locked;
  if (firstLineComplete && live && !locked) {
    locked = live;
  }

  return { label: locked ?? live, locked };
}
