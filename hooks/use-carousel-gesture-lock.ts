import { useEffect, type RefObject } from "react"

const GESTURE_THRESHOLD_PX = 8
const VERTICAL_SWIPE_RATIO = 1.2

/** Elements where horizontal drag should not scroll the carousel (charts, inputs, etc.) */
const INTERACTIVE_SELECTOR =
  '[data-chart], [data-carousel-interactive], [data-scrollable="true"], button, a, input, textarea, select, [role="slider"], [contenteditable="true"]'

type GestureMode = "undecided" | "carousel" | "interactive"

function canScrollInDirection(element: HTMLElement, deltaY: number) {
  const { scrollTop, scrollHeight, clientHeight } = element
  if (scrollHeight <= clientHeight + 1) return false
  if (deltaY < 0) return scrollTop > 0
  if (deltaY > 0) return scrollTop + clientHeight < scrollHeight - 1
  return false
}

export function useCarouselGestureLock(
  scrollerRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const gesture: { mode: GestureMode; startX: number; startY: number; fromInteractive: boolean } = {
      mode: "undecided",
      startX: 0,
      startY: 0,
      fromInteractive: false,
    }

    const reset = () => {
      gesture.mode = "undecided"
      gesture.fromInteractive = false
    }

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return

      gesture.mode = "undecided"
      gesture.startX = touch.clientX
      gesture.startY = touch.clientY
      gesture.fromInteractive = !!(event.target as Element | null)?.closest(
        INTERACTIVE_SELECTOR
      )
    }

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return

      if (gesture.mode === "interactive") {
        event.preventDefault()
        return
      }

      if (gesture.mode === "carousel") {
        return
      }

      const dx = touch.clientX - gesture.startX
      const dy = touch.clientY - gesture.startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (absDx < GESTURE_THRESHOLD_PX && absDy < GESTURE_THRESHOLD_PX) {
        return
      }

      if (gesture.fromInteractive) {
        const isVerticalSwipe =
          absDy > absDx * VERTICAL_SWIPE_RATIO && absDy > GESTURE_THRESHOLD_PX

        const scrollable = (event.target as Element | null)?.closest(
          '[data-scrollable="true"]'
        ) as HTMLElement | null

        if (scrollable && isVerticalSwipe && canScrollInDirection(scrollable, dy)) {
          gesture.mode = "interactive"
          return
        }

        if (isVerticalSwipe) {
          gesture.mode = "carousel"
          return
        }

        gesture.mode = "interactive"
        event.preventDefault()
        return
      }

      if (absDy > absDx) {
        gesture.mode = "carousel"
        return
      }

      gesture.mode = "interactive"
      event.preventDefault()
    }

    scroller.addEventListener("touchstart", onTouchStart, { passive: true, capture: true })
    scroller.addEventListener("touchmove", onTouchMove, { passive: false, capture: true })
    scroller.addEventListener("touchend", reset, { passive: true, capture: true })
    scroller.addEventListener("touchcancel", reset, { passive: true, capture: true })

    return () => {
      scroller.removeEventListener("touchstart", onTouchStart, true)
      scroller.removeEventListener("touchmove", onTouchMove, true)
      scroller.removeEventListener("touchend", reset, true)
      scroller.removeEventListener("touchcancel", reset, true)
    }
  }, [scrollerRef])
}
