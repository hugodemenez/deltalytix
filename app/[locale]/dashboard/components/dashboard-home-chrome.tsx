'use client'

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Tabs } from '@/components/ui/tabs'
import { useI18n } from '@/locales/client'
import { WidgetToolbarHostProvider } from './widget-toolbar-host'
import { ConnectionsStrip } from './connections-strip'
import { useDashboardHomeTabsStore } from '@/store/dashboard-home-tabs-store'

/**
 * Instant shell chrome for Dashboard home: real tab labels + layout math.
 * Mounts outside the content Suspense boundary so tabs paint once and only
 * the heavy tab bodies (widgets / table / accounts) stream independently —
 * same Instant Navigations model as ConnectionsPageChrome.
 *
 * Keep request-bound hooks (e.g. useSearchParams) out of this shell so it
 * does not suspend with the streamed content.
 */
export function DashboardHomeChrome({ children }: { children: ReactNode }) {
  const t = useI18n()
  const mainRef = useRef<HTMLElement>(null)
  const connectionsStripRef = useRef<HTMLDivElement>(null)
  const tab = useDashboardHomeTabsStore((state) => state.activeTab)
  const setTab = useDashboardHomeTabsStore((state) => state.setActiveTab)
  const setHomeActive = useDashboardHomeTabsStore(
    (state) => state.setHomeActive
  )

  useLayoutEffect(() => {
    setHomeActive(true)
    return () => setHomeActive(false)
  }, [setHomeActive])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined

    const applyHeights = () => {
      const navbar = document.querySelector(
        'nav[class*="sticky"]'
      ) as HTMLElement | null
      // Match navbar.tsx: h-14 (3.5rem). Avoid the old 96/5rem fallback that
      // left a visible strip between sticky nav and fixed tabs.
      const navbarHeight = navbar?.offsetHeight || 56

      const connectionsStrip = connectionsStripRef.current
      const connectionsStripHeight = connectionsStrip?.offsetHeight || 52
      const shellBottom = navbarHeight + connectionsStripHeight

      const main = mainRef.current
      const mainTop = main?.getBoundingClientRect().top || 0
      const calculatedPaddingTop = shellBottom - mainTop

      document.documentElement.style.setProperty(
        '--navbar-height',
        `${navbarHeight}px`
      )
      document.documentElement.style.setProperty(
        '--tabs-height',
        `${connectionsStripHeight}px`
      )
      document.documentElement.style.setProperty(
        '--calculated-padding-top',
        `${calculatedPaddingTop}px`
      )
    }

    const calculateHeight = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Debounce resize/mutation noise only — first paint must be immediate
      // so Instant Nav does not flash the old 5rem gap.
      timeoutId = setTimeout(applyHeights, 100)
    }

    applyHeights()
    window.addEventListener('resize', calculateHeight)

    const resizeObserver = new ResizeObserver(calculateHeight)
    const navbar = document.querySelector('nav[class*="sticky"]')
    if (navbar) {
      resizeObserver.observe(navbar)
    }
    if (connectionsStripRef.current) {
      resizeObserver.observe(connectionsStripRef.current)
    }

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const hasFilterTags =
            Array.from(mutation.addedNodes).some(
              (node) =>
                node.nodeType === Node.ELEMENT_NODE &&
                (node as Element).classList?.contains('border-t')
            ) ||
            Array.from(mutation.removedNodes).some(
              (node) =>
                node.nodeType === Node.ELEMENT_NODE &&
                (node as Element).classList?.contains('border-t')
            )

          if (hasFilterTags) {
            calculateHeight()
          }
        }
      })
    })

    if (navbar) {
      mutationObserver.observe(navbar, {
        childList: true,
        subtree: true,
      })
    }

    return () => {
      window.removeEventListener('resize', calculateHeight)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  return (
    <main
      ref={mainRef}
      id="dashboard-content"
      tabIndex={-1}
      className="min-h-[calc(100dvh-var(--navbar-height,3.5rem))] overflow-x-hidden bg-[#FAFAFA] dark:bg-background"
    >
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        {t('dashboard.skipToContent')}
      </a>
      <Tabs
        value={tab}
        onValueChange={(value) =>
          setTab(value as 'widgets' | 'table' | 'accounts')
        }
        className="w-full h-full pt-(--tabs-height,3rem)"
      >
        <div
          ref={connectionsStripRef}
          className="fixed inset-x-0 top-(--navbar-height,3.5rem) z-30 w-full border-b border-[#E5E5E5] bg-white dark:border-border dark:bg-background"
        >
          <ConnectionsStrip className="bg-white dark:bg-background" />
        </div>

        <WidgetToolbarHostProvider active={tab === 'widgets'}>
          {children}
        </WidgetToolbarHostProvider>
      </Tabs>
    </main>
  )
}
