'use client'

import { useCallback, useSyncExternalStore } from 'react'

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
