"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { getWidgetDisplayName } from "../lib/widget-display-name"
import { Widget } from "../types/dashboard"

const MINIMAP_SCALE = 0.15
const STACK_CARD_WIDTH = 36
const STACK_CARD_HEIGHT = 26
const STACK_CARD_OFFSET = 3
const MAX_STACK_CARDS = 3

export type CarouselNavigationDirection = "up" | "down"

interface MobileWidgetMinimapContextValue {
  widgets: Widget[]
  currentIndex: number
  navigationDirection: CarouselNavigationDirection
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  renderWidget: (widget: Widget) => React.ReactNode
  slideHeight: string
  onSelectIndex: (index: number) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  closeButtonRef: React.RefObject<HTMLButtonElement | null>
  dialogRef: React.RefObject<HTMLDivElement | null>
}

const MobileWidgetMinimapContext =
  createContext<MobileWidgetMinimapContextValue | null>(null)

function useMobileWidgetMinimapContext() {
  const context = useContext(MobileWidgetMinimapContext)
  if (!context) {
    throw new Error(
      "MobileWidgetMinimap components must be used within MobileWidgetMinimapProvider"
    )
  }
  return context
}

interface MobileWidgetMinimapProviderProps {
  widgets: Widget[]
  currentIndex: number
  navigationDirection: CarouselNavigationDirection
  renderWidget: (widget: Widget) => React.ReactNode
  onSelectIndex: (index: number) => void
  slideHeight: string
  children: React.ReactNode
}

function ScaledWidgetPreview({
  widget,
  renderWidget,
  slideHeight,
  className,
}: {
  widget: Widget
  renderWidget: (widget: Widget) => React.ReactNode
  slideHeight: string
  className?: string
}) {
  return (
    <div className={cn("relative overflow-hidden bg-background", className)}>
      <div
        className="pointer-events-none origin-top-left"
        style={{
          transform: `scale(${MINIMAP_SCALE})`,
          width: `${100 / MINIMAP_SCALE}%`,
          height: slideHeight,
        }}
        aria-hidden
      >
        {renderWidget(widget)}
      </div>
    </div>
  )
}

export function MobileWidgetMinimapProvider({
  widgets,
  currentIndex,
  navigationDirection,
  renderWidget,
  onSelectIndex,
  slideHeight,
  children,
}: MobileWidgetMinimapProviderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const wasExpandedRef = useRef(false)

  const handleSelect = useCallback(
    (index: number) => {
      onSelectIndex(index)
      setIsExpanded(false)
    },
    [onSelectIndex]
  )

  useEffect(() => {
    if (!isExpanded) {
      if (wasExpandedRef.current) {
        wasExpandedRef.current = false
        triggerRef.current?.focus()
      }
      return
    }

    wasExpandedRef.current = true
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setIsExpanded(false)
        return
      }

      if (event.key !== "Tab") return

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => !element.hasAttribute("inert"))

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault()
        const targetElement = event.shiftKey ? lastElement : firstElement
        targetElement.focus()
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isExpanded])

  const contextValue = useMemo<MobileWidgetMinimapContextValue>(
    () => ({
      widgets,
      currentIndex,
      navigationDirection,
      isExpanded,
      setIsExpanded,
      renderWidget,
      slideHeight,
      onSelectIndex: handleSelect,
      triggerRef,
      closeButtonRef,
      dialogRef,
    }),
    [
      widgets,
      currentIndex,
      navigationDirection,
      isExpanded,
      renderWidget,
      slideHeight,
      handleSelect,
    ]
  )

  if (widgets.length <= 1) {
    return <>{children}</>
  }

  return (
    <MobileWidgetMinimapContext.Provider value={contextValue}>
      {children}
    </MobileWidgetMinimapContext.Provider>
  )
}

export function MobileWidgetMinimapTrigger({ className }: { className?: string }) {
  const t = useI18n()
  const {
    widgets,
    currentIndex,
    navigationDirection,
    isExpanded,
    setIsExpanded,
    renderWidget,
    slideHeight,
    triggerRef,
  } = useMobileWidgetMinimapContext()

  const stackWidgets = useMemo(() => {
    if (widgets.length <= 1) return []
    const layers = Math.min(MAX_STACK_CARDS, widgets.length - 1)
    return Array.from({ length: layers }, (_, stackOffset) => {
      const index = (currentIndex + 1 + stackOffset) % widgets.length
      return { widget: widgets[index], stackOffset }
    })
  }, [widgets, currentIndex])

  if (widgets.length <= 1) {
    return null
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-expanded={isExpanded}
      aria-haspopup="dialog"
      aria-label={t("widgets.mobile.minimapOpen", {
        index: currentIndex + 1,
        total: widgets.length,
      })}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isExpanded && "pointer-events-none opacity-0",
        className
      )}
      onClick={() => setIsExpanded(true)}
    >
      <span
        className="relative block"
        style={{ width: STACK_CARD_WIDTH + 6, height: STACK_CARD_HEIGHT + 6 }}
      >
        <AnimatePresence initial={false} custom={navigationDirection}>
          {stackWidgets.map(({ widget, stackOffset }) => {
            const deepestOffset = Math.max(0, stackWidgets.length - 1)
            const targetOffset = stackOffset * STACK_CARD_OFFSET
            const initialOffset =
              navigationDirection === "up"
                ? deepestOffset * STACK_CARD_OFFSET
                : targetOffset

            return (
              <motion.span
                key={widget.i}
                custom={navigationDirection}
                className="absolute overflow-hidden rounded border border-border/80 bg-card"
                style={{
                  width: STACK_CARD_WIDTH,
                  height: STACK_CARD_HEIGHT,
                  right: 0,
                  bottom: 0,
                }}
                initial={{
                  x: -initialOffset,
                  y: -initialOffset,
                  scale:
                    navigationDirection === "up" ? 0.88 : 1 - stackOffset * 0.04,
                  zIndex:
                    navigationDirection === "up" ? 0 : MAX_STACK_CARDS - stackOffset,
                }}
                animate={{
                  x: -targetOffset,
                  y: -targetOffset,
                  scale: 1 - stackOffset * 0.04,
                  zIndex: MAX_STACK_CARDS - stackOffset,
                }}
                variants={{
                  exit: (direction: CarouselNavigationDirection) =>
                    direction === "down"
                      ? {
                          x: -deepestOffset * STACK_CARD_OFFSET,
                          y: -deepestOffset * STACK_CARD_OFFSET,
                          scale: 0.88,
                          zIndex: 0,
                        }
                      : {
                          x: -(deepestOffset + 1) * STACK_CARD_OFFSET,
                          y: -(deepestOffset + 1) * STACK_CARD_OFFSET,
                          scale: 0.84,
                          zIndex: 0,
                        },
                }}
                exit="exit"
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 34,
                  mass: 0.7,
                }}
              >
                <ScaledWidgetPreview
                  widget={widget}
                  renderWidget={renderWidget}
                  slideHeight={slideHeight}
                  className="h-full w-full"
                />
              </motion.span>
            )
          })}
        </AnimatePresence>
      </span>
    </button>
  )
}

export function MobileWidgetMinimapOverlay() {
  const t = useI18n()
  const shouldReduceMotion = useReducedMotion()
  const {
    widgets,
    currentIndex,
    isExpanded,
    setIsExpanded,
    renderWidget,
    slideHeight,
    onSelectIndex,
    closeButtonRef,
    dialogRef,
  } = useMobileWidgetMinimapContext()

  const upcomingWidgets = useMemo(() => {
    if (widgets.length <= 1) return []
    return Array.from({ length: widgets.length - 1 }, (_, step) => {
      const index = (currentIndex + 1 + step) % widgets.length
      return { widget: widgets[index], index }
    })
  }, [widgets, currentIndex])

  if (widgets.length <= 1) {
    return null
  }

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("widgets.mobile.minimapNavigation")}
          className="fixed inset-x-0 top-0 z-40 flex flex-col"
          style={{ bottom: "var(--mobile-toolbar-top, 5.5rem)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.2 }}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("widgets.mobile.minimapClose")}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          />

          <motion.div
            className="relative z-10 m-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-background/95"
            initial={
              shouldReduceMotion
                ? false
                : { transform: "translateY(24px) scale(0.96)" }
            }
            animate={{ transform: "translateY(0) scale(1)" }}
            exit={
              shouldReduceMotion
                ? { transform: "translateY(0) scale(1)" }
                : { transform: "translateY(24px) scale(0.96)" }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 32 }
            }
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-medium">
                {t("widgets.mobile.minimapNavigation")}
              </p>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label={t("widgets.mobile.minimapClose")}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 [-webkit-overflow-scrolling:touch]">
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                role="listbox"
                aria-label={t("widgets.mobile.minimapNavigation")}
              >
                {upcomingWidgets.map(({ widget, index }) => {
                  const widgetName = getWidgetDisplayName(t, widget.type)

                  return (
                    <button
                      key={widget.i}
                      type="button"
                      role="option"
                      aria-selected={false}
                      aria-label={t("widgets.mobile.carouselGoTo", {
                        index: index + 1,
                        total: widgets.length,
                        widgetName,
                      })}
                      className={cn(
                        "flex flex-col gap-1.5 rounded-xl border p-2 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/40"
                      )}
                      onClick={() => onSelectIndex(index)}
                    >
                      <ScaledWidgetPreview
                        widget={widget}
                        renderWidget={renderWidget}
                        slideHeight={slideHeight}
                        className="aspect-[4/3] w-full rounded-lg border border-border/50"
                      />
                      <span className="truncate px-0.5 text-xs font-medium text-foreground/90">
                        {widgetName}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
