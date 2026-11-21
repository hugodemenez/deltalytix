/**
 * AI SDK 7 rejects `role: "system"` inside `messages`. System text belongs in
 * `instructions`. Drop system rows from client-supplied history before
 * `convertToModelMessages` / `streamText`.
 */
export function omitSystemMessages<T extends { role?: string }>(
  messages: readonly T[],
): T[] {
  return messages.filter((message) => message.role !== "system")
}
