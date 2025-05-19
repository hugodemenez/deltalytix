import { useEffect } from 'react'

export function useAutoScroll(isEnabled: boolean) {
  useEffect(() => {
    if (!isEnabled) return

    let scrollInterval: NodeJS.Timeout | null = null
    let lastTouchY = 0
    const scrollThreshold = 150 // px from top/bottom to start scrolling
    const baseScrollSpeed = 15 // base scroll speed
    const maxScrollSpeed = 30 // maximum scroll speed

    // Add style to prevent selection
    const style = document.createElement('style')
    style.textContent = `
      body.dragging {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        touch-action: none !important;
        -webkit-touch-callout: none !important;
      }
      body.dragging * {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        -webkit-touch-callout: none !important;
      }
    `
    document.head.appendChild(style)

    function performScroll() {
      const windowHeight = window.innerHeight
      const scrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - windowHeight

      if (lastTouchY < scrollThreshold) {
        // Scrolling up - speed increases as you get closer to the top
        const factor = 1 - (lastTouchY / scrollThreshold)
        const speed = Math.min(maxScrollSpeed, baseScrollSpeed + (maxScrollSpeed * factor))
        const newScrollY = Math.max(0, scrollY - speed)
        window.scrollTo({ top: newScrollY })
      } else if (lastTouchY > windowHeight - scrollThreshold) {
        // Scrolling down - speed increases as you get closer to the bottom
        const factor = (lastTouchY - (windowHeight - scrollThreshold)) / scrollThreshold
        const speed = Math.min(maxScrollSpeed, baseScrollSpeed + (maxScrollSpeed * factor))
        const newScrollY = Math.min(maxScroll, scrollY + speed)
        window.scrollTo({ top: newScrollY })
      }
    }

    function handleTouchStart() {
      document.body.classList.add('dragging')
    }

    function handleTouchMove(e: TouchEvent) {
      // Prevent default to ensure smooth scrolling
      e.preventDefault()

      const touch = e.touches[0]
      const touchY = touch.clientY
      lastTouchY = touchY
      const windowHeight = window.innerHeight

      // Start scrolling interval if near edges and not already scrolling
      if ((touchY < scrollThreshold || touchY > windowHeight - scrollThreshold) && !scrollInterval) {
        scrollInterval = setInterval(performScroll, 16) // ~60fps
      }
      // Stop scrolling if not near edges
      else if (touchY >= scrollThreshold && touchY <= windowHeight - scrollThreshold && scrollInterval) {
        clearInterval(scrollInterval)
        scrollInterval = null
      }
    }

    function handleTouchEnd() {
      document.body.classList.remove('dragging')
      if (scrollInterval) {
        clearInterval(scrollInterval)
        scrollInterval = null
      }
    }

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
      if (scrollInterval) {
        clearInterval(scrollInterval)
      }
      // Clean up the style element
      style.remove()
    }
  }, [isEnabled])
} 