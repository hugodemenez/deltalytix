/** Pixel snaps — bare numbers are treated as viewport-height fractions. */
export const CONSENT_COMPACT_SNAP = "140px";
export const CONSENT_SHEET_SNAP = "480px";

export const CONSENT_SNAP_POINTS = [
  CONSENT_COMPACT_SNAP,
  CONSENT_SHEET_SNAP,
] as const;

export type ConsentSnapPoint =
  (typeof CONSENT_SNAP_POINTS)[number];

/**
 * Vaul's handle tap on the last snap calls `setActiveSnapPoint(undefined)`.
 * Ignore that (and any other unknown value) so the bar cannot dismiss.
 */
export function clampConsentSnapPoint(
  next: string | number | null | undefined,
  current: ConsentSnapPoint,
): ConsentSnapPoint {
  if (next === CONSENT_SHEET_SNAP || next === CONSENT_COMPACT_SNAP) {
    return next;
  }
  return current;
}
