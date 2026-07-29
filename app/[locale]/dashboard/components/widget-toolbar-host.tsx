'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useData } from '@/context/data-provider'
import { MOBILE_CAROUSEL_HEIGHT } from '@/lib/widget-carousel'
import { Toolbar } from './toolbar'
import {
  MobileWidgetMinimapOverlay,
  MobileWidgetMinimapProvider,
  MobileWidgetMinimapTrigger,
  MobileWidgetMinimapTriggerSkeleton,
  type CarouselNavigationDirection,
} from './mobile-widget-minimap'
import type { Layouts, Widget, WidgetSize, WidgetType } from '../types/dashboard'

export type WidgetToolbarMinimap = {
  widgets: Widget[]
  currentIndex: number
  navigationDirection: CarouselNavigationDirection
  renderWidget: (widget: Widget) => ReactNode
  onSelectIndex: (index: number) => void
  slideHeight: string
}

export type WidgetToolbarActions = {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
  onEditToggle: () => void
  currentLayout: Layouts
  onRemoveAll: () => void
  onRestoreDefaults: () => void
  mobileActiveWidget?: Widget | null
  onRemoveWidget?: (widgetId: string) => void
  /** Present on mobile carousel when WidgetCanvas is mounted. */
  minimap?: WidgetToolbarMinimap | null
}

type WidgetToolbarHostContextValue = {
  register: (actions: WidgetToolbarActions | null) => void
}

const WidgetToolbarHostContext =
  createContext<WidgetToolbarHostContextValue | null>(null)

const EMPTY_LAYOUT: Layouts = { desktop: [], mobile: [] }

const PLACEHOLDER_MINIMAP: WidgetToolbarMinimap = {
  widgets: [],
  currentIndex: 0,
  navigationDirection: 'down',
  renderWidget: () => null,
  onSelectIndex: () => {},
  slideHeight: MOBILE_CAROUSEL_HEIGHT,
}

/**
 * Persistent widgets-tab toolbar chrome (outside content Suspense).
 * WidgetCanvas registers live actions + minimap when ready; until then
 * only the minimap slot is skeletonized on mobile (stacked sheet deck).
 */
export function WidgetToolbarHostProvider({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  const [actions, setActions] = useState<WidgetToolbarActions | null>(null)
  const register = useCallback((next: WidgetToolbarActions | null) => {
    setActions(next)
  }, [])
  const value = useMemo(() => ({ register }), [register])

  return (
    <WidgetToolbarHostContext.Provider value={value}>
      {children}
      {active ? <WidgetToolbarHost actions={actions} /> : null}
    </WidgetToolbarHostContext.Provider>
  )
}

function WidgetToolbarHost({
  actions,
}: {
  actions: WidgetToolbarActions | null
}) {
  const { isMobile } = useData()
  const ready = actions !== null
  const minimap = actions?.minimap ?? null
  const liveMinimap = Boolean(minimap && minimap.widgets.length > 1)
  // Keep the mobile slot reserved until we know the live deck is unnecessary —
  // avoids toolbar width jump while canvas/isMobile settle.
  const definitiveNoMinimap =
    ready && minimap !== null && minimap.widgets.length <= 1
  const showMinimapSlot = isMobile === true && !definitiveNoMinimap

  const toolbar = (
    <Toolbar
      onAddWidget={actions?.onAddWidget ?? (() => {})}
      isCustomizing={actions?.isCustomizing ?? false}
      onEditToggle={actions?.onEditToggle ?? (() => {})}
      currentLayout={actions?.currentLayout ?? EMPTY_LAYOUT}
      onRemoveAll={actions?.onRemoveAll ?? (() => {})}
      onRestoreDefaults={actions?.onRestoreDefaults ?? (() => {})}
      mobileActiveWidget={actions?.mobileActiveWidget ?? null}
      onRemoveWidget={actions?.onRemoveWidget}
      minimapTrigger={
        !showMinimapSlot
          ? undefined
          : liveMinimap
            ? <MobileWidgetMinimapTrigger />
            : <MobileWidgetMinimapTriggerSkeleton />
      }
    />
  )

  // Stable tree on mobile: always the same provider wrapper so Toolbar does
  // not remount when the live minimap replaces the skeleton (Connections-style).
  if (isMobile === true) {
    const providerMinimap =
      liveMinimap && minimap ? minimap : PLACEHOLDER_MINIMAP
    return (
      <MobileWidgetMinimapProvider
        widgets={providerMinimap.widgets}
        currentIndex={providerMinimap.currentIndex}
        navigationDirection={providerMinimap.navigationDirection}
        renderWidget={providerMinimap.renderWidget}
        onSelectIndex={providerMinimap.onSelectIndex}
        slideHeight={providerMinimap.slideHeight}
      >
        {toolbar}
        {liveMinimap ? <MobileWidgetMinimapOverlay /> : null}
      </MobileWidgetMinimapProvider>
    )
  }

  return toolbar
}

/** Register live toolbar actions from WidgetCanvas; clears on unmount. */
export function useRegisterWidgetToolbar(actions: WidgetToolbarActions) {
  const ctx = useContext(WidgetToolbarHostContext)

  // Keep actions fresh without tearing down the chrome toolbar on each update.
  useEffect(() => {
    if (!ctx) return
    ctx.register(actions)
  }, [
    actions.currentLayout,
    actions.isCustomizing,
    actions.minimap,
    actions.mobileActiveWidget,
    actions.onAddWidget,
    actions.onEditToggle,
    actions.onRemoveAll,
    actions.onRemoveWidget,
    actions.onRestoreDefaults,
    ctx,
  ])

  useEffect(() => {
    if (!ctx) return
    return () => {
      ctx.register(null)
    }
  }, [ctx])
}
