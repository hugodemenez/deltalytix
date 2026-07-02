import { useEffect, type RefObject } from "react"

const GESTURE_THRESHOLD_PX = 8
/** Horizontal drag must clearly dominate before we block carousel scroll (chart scrub). */
const HORIZONTAL_SCRUB_RATIO = 1.25

const CHART_SELECTOR = "[data-chart], [data-carousel-interactive]"

/** Elements where horizontal drag should not scroll the carousel (charts, inputs, etc.) */
const INTERACTIVE_SELECTOR =
  `${CHART_SELECTOR}, [data-scrollable="true"], button, a, input, textarea, select, [role="slider"], [contenteditable="true"]`

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

    const gesture: {
      mode: GestureMode
      startX: number
      startY: number
      fromChart: boolean
      fromInteractive: boolean
    } = {
      mode: "undecided",
      startX: 0,
      startY: 0,
      fromChart: false,
      fromInteractive: false,
    }

    const reset = () => {
      gesture.mode = "undecided"
      gesture.fromChart = false
      gesture.fromInteractive = false
    }

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return

      const target = event.target as Element | null
      gesture.mode = "undecided"
      gesture.startX = touch.clientX
      gesture.startY = touch.clientY
      gesture.fromChart = !!target?.closest(CHART_SELECTOR)
      gesture.fromInteractive = !!target?.closest(INTERACTIVE_SELECTOR)
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

      const scrollable = (event.target as Element | null)?.closest(
        '[data-scrollable="true"]'
      ) as HTMLElement | null

      if (
        scrollable &&
        absDy > GESTURE_THRESHOLD_PX &&
        canScrollInDirection(scrollable, dy)
      ) {
        gesture.mode = "interactive"
        return
      }

      if (gesture.fromChart) {
        const isHorizontalScrub =
          absDx > absDy * HORIZONTAL_SCRUB_RATIO && absDx > GESTURE_THRESHOLD_PX

        if (isHorizontalScrub) {
          gesture.mode = "interactive"
          event.preventDefault()
          return
        }

        gesture.mode = "carousel"
        return
      }

      if (gesture.fromInteractive) {
        if (absDy >= absDx) {
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
