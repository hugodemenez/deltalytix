/** Fits inside the format-name task's 2000 output-token cap. */
export const FORMAT_NAME_MAX_BATCH = 20

export function formatNameBatchError(
  count: number,
): { error: string; max: number } | null {
  if (!Number.isInteger(count) || count < 1 || count > FORMAT_NAME_MAX_BATCH) {
    return {
      error: `Name inference accepts 1 to ${FORMAT_NAME_MAX_BATCH} emails per request`,
      max: FORMAT_NAME_MAX_BATCH,
    }
  }
  return null
}
