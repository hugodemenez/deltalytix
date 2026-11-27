"use client";

import { useEffect, useState } from "react";
import {
  getBlackFridayDisplay,
  nextBlackFridayBoundary,
  type BlackFridayDisplay,
} from "@/lib/black-friday-promo";

/** Browsers clamp setTimeout to 2^31-1 ms. Recheck if the boundary is further out. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Active Black Friday offer, evaluated after mount so prerender never reads
 * the clock. Re-reads at the next Paris boundary and when the tab is shown
 * again, so the banner can appear or leave without a redeploy.
 */
export function useBlackFridayDisplay(): BlackFridayDisplay | undefined {
  const [display, setDisplay] = useState<BlackFridayDisplay | undefined>(
    undefined,
  );

  useEffect(() => {
    let timer = 0;

    const apply = () => {
      window.clearTimeout(timer);
      const now = new Date();
      setDisplay(getBlackFridayDisplay(now));
      const next = nextBlackFridayBoundary(now);
      if (!next) return;
      const delay = Math.min(
        Math.max(next.getTime() - now.getTime(), 0),
        MAX_TIMEOUT_MS,
      );
      timer = window.setTimeout(apply, delay);
    };

    apply();

    const onVisible = () => {
      if (document.visibilityState === "visible") apply();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return display;
}
