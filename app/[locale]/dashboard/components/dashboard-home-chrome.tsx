'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useI18n } from '@/locales/client'
import { WidgetToolbarHostProvider } from './widget-toolbar-host'

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
  const tabsListRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState('widgets')

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined

    const applyHeights = () => {
      const navbar = document.querySelector(
        'nav[class*="sticky"]'
      ) as HTMLElement | null
      // Match navbar.tsx: h-16 (4rem). Avoid the old 96/5rem fallback that
      // left a visible strip between sticky nav and fixed tabs.
      const navbarHeight = navbar?.offsetHeight || 64

      const tabsList = tabsListRef.current
      const tabsListHeight = tabsList?.offsetHeight || 48
      const tabsWrapperBottom = navbarHeight + tabsListHeight

      const main = mainRef.current
      const mainTop = main?.getBoundingClientRect().top || 0
      const calculatedPaddingTop = tabsWrapperBottom - mainTop

      document.documentElement.style.setProperty(
        '--navbar-height',
        `${navbarHeight}px`
      )
      document.documentElement.style.setProperty(
        '--tabs-height',
        `${tabsListHeight}px`
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
      className="overflow-x-hidden"
    >
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        {t('dashboard.skipToContent')}
      </a>
      <Tabs
        value={tab}
        onValueChange={setTab}
        className="w-full h-full pt-(--tabs-height,3rem)"
      >
        <div
          ref={tabsListRef}
          className="fixed inset-x-0 top-(--navbar-height,4rem) z-30 w-full overflow-x-auto border-b bg-background shadow-xs"
        >
          <TabsList className="h-12 w-full min-w-max max-w-none rounded-none bg-muted/70 sm:min-w-0">
            <TabsTrigger value="widgets">
              {t('dashboard.tabs.widgets')}
            </TabsTrigger>
            <TabsTrigger value="table">{t('dashboard.tabs.table')}</TabsTrigger>
            <TabsTrigger value="accounts">
              {t('dashboard.tabs.accounts')}
            </TabsTrigger>
          </TabsList>
        </div>

        <WidgetToolbarHostProvider active={tab === 'widgets'}>
          {children}
        </WidgetToolbarHostProvider>
      </Tabs>
    </main>
  )
}
