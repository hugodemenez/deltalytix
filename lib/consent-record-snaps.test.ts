import { describe, expect, it } from "vitest";

import {
  CONSENT_COMPACT_SNAP,
  CONSENT_SHEET_SNAP,
  CONSENT_SNAP_POINTS,
  clampConsentSnapPoint,
} from "./consent-record-snaps";

describe("consent record snaps", () => {
  it("exposes exactly two pixel snaps", () => {
    expect(CONSENT_SNAP_POINTS).toEqual([
      CONSENT_COMPACT_SNAP,
      CONSENT_SHEET_SNAP,
    ]);
    expect(CONSENT_SNAP_POINTS).toHaveLength(2);
    expect(CONSENT_COMPACT_SNAP.endsWith("px")).toBe(true);
    expect(CONSENT_SHEET_SNAP.endsWith("px")).toBe(true);
  });

  it("accepts only the two locked snaps", () => {
    expect(clampConsentSnapPoint(CONSENT_COMPACT_SNAP, CONSENT_SHEET_SNAP)).toBe(
      CONSENT_COMPACT_SNAP,
    );
    expect(clampConsentSnapPoint(CONSENT_SHEET_SNAP, CONSENT_COMPACT_SNAP)).toBe(
      CONSENT_SHEET_SNAP,
    );
  });

  it("ignores a handle tap past the last snap so the bar cannot dismiss", () => {
    expect(clampConsentSnapPoint(undefined, CONSENT_SHEET_SNAP)).toBe(
      CONSENT_SHEET_SNAP,
    );
    expect(clampConsentSnapPoint(null, CONSENT_COMPACT_SNAP)).toBe(
      CONSENT_COMPACT_SNAP,
    );
    expect(clampConsentSnapPoint(0, CONSENT_SHEET_SNAP)).toBe(CONSENT_SHEET_SNAP);
  });
});
