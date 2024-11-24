import { useEffect } from 'react'

export function useAutoScroll(isEnabled: boolean) {
  useEffect(() => {
    if (!isEnabled) return

    const handleDrag = (e: TouchEvent) => {
      const windowHeight = window.innerHeight
      const touchY = e.touches[0].clientY
      const scrollThreshold = 100

      if (touchY < scrollThreshold) {
        window.scrollBy({ top: -10, behavior: 'smooth' })
      } else if (touchY > windowHeight - scrollThreshold) {
        window.scrollBy({ top: 10, behavior: 'smooth' })
      }
    }

    document.addEventListener('touchmove', handleDrag, { passive: false })
    return () => document.removeEventListener('touchmove', handleDrag)
  }, [isEnabled])
} 