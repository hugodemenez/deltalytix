'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TradeTableReview } from './components/tables/trade-table-review'
import { AccountsOverview } from './components/accounts/accounts-overview'
import { AnalysisOverview } from './components/analysis/analysis-overview'
import WidgetCanvas from './components/widget-canvas'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from "@/locales/client"

export default function Home() {
  const t = useI18n()
  const mainRef = useRef<HTMLElement>(null)
  const tabsListRef = useRef<HTMLDivElement>(null)
  const [dynamicHeight, setDynamicHeight] = useState('220px') // fallback

  useEffect(() => {
    const calculateHeight = () => {
      // Get navbar height - it's fixed at the top
      const navbar = document.querySelector('nav[class*="fixed"]') as HTMLElement
      const navbarHeight = navbar?.offsetHeight || 72 // fallback to 72px

      // Get main container padding (py-6 lg:py-8)
      const mainContainer = mainRef.current
      const mainPaddingTop = mainContainer ? parseFloat(getComputedStyle(mainContainer).paddingTop) : 24 // fallback to py-6 (24px)

      // Get tabs list height
      const tabsList = tabsListRef.current
      const tabsListHeight = tabsList?.offsetHeight || 0

      // Get TabsList margin bottom (mb-4 = 16px)
      const tabsListMarginBottom = tabsList ? parseFloat(getComputedStyle(tabsList).marginBottom) : 16

      // Get any additional gaps/padding from the layout
      const layoutContainer = document.querySelector('[class*="px-2"][class*="sm:px-8"]') as HTMLElement
      const layoutPaddingTop = layoutContainer ? parseFloat(getComputedStyle(layoutContainer).paddingTop) : 0

      const totalHeight = navbarHeight + mainPaddingTop + tabsListHeight + tabsListMarginBottom + layoutPaddingTop + 16
      setDynamicHeight(`${totalHeight}px`)
    }

    // Calculate on mount
    calculateHeight()

    // Recalculate on window resize
    window.addEventListener('resize', calculateHeight)
    
    // Cleanup
    return () => window.removeEventListener('resize', calculateHeight)
  }, [])

  return (
    <main ref={mainRef} className="flex w-full min-h-screen py-6 lg:py-8 overflow-x-hidden">
      <div className="flex flex-1 flex-col w-full px-4">
        <Tabs defaultValue="widgets" className="w-full h-full flex flex-col">
          <TabsList ref={tabsListRef} className="mb-4">
            <TabsTrigger value="widgets">{t('dashboard.tabs.widgets')}</TabsTrigger>
            <TabsTrigger value="table">{t('dashboard.tabs.table')}</TabsTrigger>
            <TabsTrigger value="accounts">{t('dashboard.tabs.accounts')}</TabsTrigger>
            <TabsTrigger value="analysis">{t('dashboard.tabs.analysis')}</TabsTrigger>
          </TabsList>
          
          <TabsContent 
            value="table" 
            className="flex-1 min-h-0"
            style={{ maxHeight: `calc(100vh - ${dynamicHeight})` }}
          >
            <div className="h-full">
              <TradeTableReview />
            </div>
          </TabsContent>
          
          <TabsContent
            value="accounts"
            className="flex-1 min-h-0"
            style={{ maxHeight: `calc(100vh - ${dynamicHeight})` }}
          >
            <div className="h-full">
              <AccountsOverview size="large" />
            </div>
          </TabsContent>
          
          <TabsContent
            value="analysis"
            className="flex-1 min-h-0"
            style={{ maxHeight: `calc(100vh - ${dynamicHeight})` }}
          >
            <div className="h-full overflow-y-auto">
              <AnalysisOverview />
            </div>
          </TabsContent>
          
          <TabsContent value="widgets" className="flex-1 min-h-0">
            <div className="h-full">
              <WidgetCanvas />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}