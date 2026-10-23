"use client";

import { useEffect } from "react";

import { setAdsHashedEmail } from "@/lib/google-ads";

/**
 * Hands the signed-in user's SHA-256 email hash (computed server-side) to the
 * Ads conversions, which attach it only when ad_user_data is granted.
 */
export function GoogleAdsUserData({ hashedEmail }: { hashedEmail: string }) {
  useEffect(() => {
    setAdsHashedEmail(hashedEmail);
    return () => setAdsHashedEmail(null);
  }, [hashedEmail]);

  return null;
}
