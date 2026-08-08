/**
 * Restrict cache-tag invalidation to tags owned by the session user.
 * Expected tag shape: `<prefix>-<userId>` (e.g. `trades-<userId>`).
 */
export function filterSessionScopedCacheTags(
  tags: string[],
  userId: string
): string[] {
  if (!userId) return []
  const allowedSuffix = `-${userId}`
  return tags.filter(
    (tag) => typeof tag === "string" && tag.endsWith(allowedSuffix)
  )
}
