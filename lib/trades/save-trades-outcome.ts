/**
 * After `createMany({ skipDuplicates: true })`, Protocol resync can still
 * update existing rows (e.g. Product RMS commissions). Cache invalidation
 * must run whenever anything was written — not only when new rows were
 * inserted.
 */
export function isDuplicateTradesOnlySave(
  createdCount: number,
  commissionsUpdated: number,
): boolean {
  return createdCount === 0 && commissionsUpdated === 0
}
