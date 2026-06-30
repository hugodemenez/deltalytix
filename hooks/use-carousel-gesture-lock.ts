import { useEffect, type RefObject } from "react"

const GESTURE_THRESHOLD_PX = 8
/** Horizontal drag must clearly dominate before we block carousel scroll (chart scrub). */
const HORIZONTAL_SCRUB_RATIO = 1.25

const CHART_SELECTOR = "[data-chart]"
const CAROUSEL_INTERACTIVE_SELECTOR = "[data-carousel-interactive]"

/** Elements where horizontal drag should stay with the nested control. */
const INTERACTIVE_SELECTOR =
  `${CHART_SELECTOR}, ${CAROUSEL_INTERACTIVE_SELECTOR}, [data-scrollable="true"], button, a, input, textarea, select, [role="slider"], [contenteditable="true"]`

type GestureMode =
  | "undecided"
  | "carousel"
  | "native-scroll"
  | "interactive"
  | "chart-scrub"

type ScrollMetrics = Pick<
  HTMLElement,
  "scrollTop" | "scrollHeight" | "clientHeight"
>

export function canScrollInDirection(
  { scrollTop, scrollHeight, clientHeight }: ScrollMetrics,
  deltaY: number
) {
  if (scrollHeight <= clientHeight + 1) return false
  if (deltaY < 0) return scrollTop > 0
  if (deltaY > 0) return scrollTop + clientHeight < scrollHeight - 1
  return false
}

export function allowsVerticalScroll(overflowY: string) {
  return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay"
}

function isVerticallyScrollable(element: HTMLElement) {
  if (element.dataset.scrollable === "true") {
    return element.scrollHeight > element.clientHeight + 1
  }

  return (
    allowsVerticalScroll(window.getComputedStyle(element).overflowY) &&
    element.scrollHeight > element.clientHeight + 1
  )
}

function getScrollableAncestor(
  target: Element | null,
  boundary: HTMLElement
): HTMLElement | null {
  let current =
    target instanceof HTMLElement ? target : target?.parentElement ?? null

  while (current && current !== boundary) {
    if (isVerticallyScrollable(current)) {
      return current
    }

    current = current.parentElement
  }

  return null
}

export interface CarouselGestureDecisionInput {
  absDx: number
  absDy: number
  fromChart: boolean
  fromInteractive: boolean
  nativeScrollableCanScroll: boolean
}

export interface CarouselGestureDecision {
  mode: GestureMode
  preventDefault: boolean
}

export function getCarouselGestureDecision({
  absDx,
  absDy,
  fromChart,
  fromInteractive,
  nativeScrollableCanScroll,
}: CarouselGestureDecisionInput): CarouselGestureDecision {
  if (absDx < GESTURE_THRESHOLD_PX && absDy < GESTURE_THRESHOLD_PX) {
    return { mode: "undecided", preventDefault: false }
  }

  if (absDy >= absDx && nativeScrollableCanScroll) {
    return { mode: "native-scroll", preventDefault: false }
  }

  if (fromChart) {
    const isHorizontalScrub =
      absDx > absDy * HORIZONTAL_SCRUB_RATIO && absDx > GESTURE_THRESHOLD_PX

    if (isHorizontalScrub) {
      return { mode: "chart-scrub", preventDefault: true }
    }

    return { mode: "carousel", preventDefault: false }
  }

  if (fromInteractive) {
    if (absDy >= absDx) {
      return { mode: "carousel", preventDefault: false }
    }

    return { mode: "interactive", preventDefault: false }
  }

  if (absDy > absDx) {
    return { mode: "carousel", preventDefault: false }
  }

  return { mode: "interactive", preventDefault: false }
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

      if (gesture.mode === "chart-scrub") {
        event.preventDefault()
        return
      }

      if (
        gesture.mode === "carousel" ||
        gesture.mode === "native-scroll" ||
        gesture.mode === "interactive"
      ) {
        return
      }

      const dx = touch.clientX - gesture.startX
      const dy = touch.clientY - gesture.startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      const scrollable = getScrollableAncestor(
        event.target as Element | null,
        scroller
      )
      const decision = getCarouselGestureDecision({
        absDx,
        absDy,
        fromChart: gesture.fromChart,
        fromInteractive: gesture.fromInteractive,
        nativeScrollableCanScroll: scrollable
          ? canScrollInDirection(scrollable, dy)
          : false,
      })

      gesture.mode = decision.mode
      if (decision.preventDefault) {
        event.preventDefault()
      }
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
