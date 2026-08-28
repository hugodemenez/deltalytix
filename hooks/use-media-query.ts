'use client'

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onStoreChange)
      return () => media.removeEventListener('change', onStoreChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    // Correct value on the very first client render, so components that
    // branch on it (e.g. popover vs drawer) don't flash the wrong variant.
    () => window.matchMedia(query).matches,
    // Server snapshot: no window; React reconciles after hydration.
    () => false
  )
}

/**
 * Media query that stays `undefined` until measured in `useLayoutEffect`.
 * Use this for layout/chrome swaps that would flash the desktop UI on mobile
 * if `useMediaQuery`'s server snapshot (`false`) painted first.
 */
export function useLayoutMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(undefined)

  useLayoutEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
