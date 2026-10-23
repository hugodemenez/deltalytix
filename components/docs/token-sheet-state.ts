export type TokenSheetEvent = "created" | "close" | "open"

/** Creating a token must never close the sheet: the secret stays on screen until the user closes it. */
export function tokenSheetOpenAfter(event: TokenSheetEvent, open: boolean): boolean {
  if (event === "open") return true
  if (event === "close") return false
  return open
}
