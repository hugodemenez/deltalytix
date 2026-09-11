"use client"

import { useLayoutMediaQuery, useMediaQuery } from "@/hooks/use-media-query"

export const MOBILE_BREAKPOINT = 768

const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Viewport mobile check. Safe for general UI branching.
 * On the server / during hydration this is `false`, then syncs to the
 * real viewport — prefer `useIsMobileLayout` for layout swaps that would
 * otherwise flash the desktop dashboard on mobile.
 */
export function useIsMobile() {
  return useMediaQuery(MOBILE_MEDIA_QUERY)
}

/**
 * Mobile flag that stays `undefined` until measured in `useLayoutEffect`,
 * so the first paint never shows the wrong dashboard layout.
 */
export function useIsMobileLayout(): boolean | undefined {
  return useLayoutMediaQuery(MOBILE_MEDIA_QUERY)
}
