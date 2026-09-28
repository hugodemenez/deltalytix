export type TradeTagOperation = "add" | "remove"

export function normalizeTagName(tag: string): string {
  return tag.trim()
}

export function uniqueTradeIds(ids: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

export function addTagToList(tags: readonly string[], tag: string): string[] {
  const normalized = normalizeTagName(tag)
  if (!normalized) return [...tags]
  if (tags.includes(normalized)) return [...tags]
  return [...tags, normalized]
}

export function removeTagFromList(
  tags: readonly string[],
  tag: string,
): string[] {
  const normalized = normalizeTagName(tag)
  if (!normalized) return [...tags]
  return tags.filter((existing) => existing !== normalized)
}

export function applyTagOperation(
  tags: readonly string[],
  tag: string,
  operation: TradeTagOperation,
): string[] {
  return operation === "add"
    ? addTagToList(tags, tag)
    : removeTagFromList(tags, tag)
}

export function unionTagLists(
  tagLists: readonly (readonly string[])[],
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const list of tagLists) {
    for (const tag of list) {
      if (seen.has(tag)) continue
      seen.add(tag)
      result.push(tag)
    }
  }
  return result
}

export function intersectionTagLists(
  tagLists: readonly (readonly string[])[],
): string[] {
  if (tagLists.length === 0) return []
  const [first, ...rest] = tagLists
  return first.filter((tag) => rest.every((list) => list.includes(tag)))
}

export function mergeTagsOnTrades<T extends { id: string; tags: string[] }>(
  trades: readonly T[],
  tradeIds: readonly string[],
  tag: string,
  operation: TradeTagOperation,
): T[] {
  const idSet = new Set(uniqueTradeIds(tradeIds))
  return trades.map((trade) => {
    if (!idSet.has(trade.id)) return trade
    return {
      ...trade,
      tags: applyTagOperation(trade.tags, tag, operation),
    }
  })
}
