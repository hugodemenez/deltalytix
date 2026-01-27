'use client'

import { useState, useEffect, startTransition } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useEffect(() => {
    const media = window.matchMedia(query)
    
    // Set initial value using startTransition
    startTransition(() => {
      setMatches(media.matches)
    })

    // Update matches when media query changes
    function listener(e: MediaQueryListEvent) {
      startTransition(() => {
        setMatches(e.matches)
      })
    }

    // Modern browsers
    media.addEventListener('change', listener)

    return () => {
      media.removeEventListener('change', listener)
    }
  }, [query])

  return matches
}