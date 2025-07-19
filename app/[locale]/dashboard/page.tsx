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

  useEffect(() => {
    const calculateHeight = () => {
      // Get navbar height - it's fixed at the top
      const navbar = document.querySelector('nav[class*="fixed"]') as HTMLElement
      const navbarHeight = navbar?.offsetHeight || 72 // fallback to 72px

      // Get tabs list height
      const tabsList = tabsListRef.current
      const tabsListHeight = tabsList?.offsetHeight || 0

      // Set CSS custom property for navbar height
      document.documentElement.style.setProperty('--navbar-height', `${navbarHeight}px`)
      document.documentElement.style.setProperty('--tabs-height', `${tabsListHeight}px`)
    }

    // Calculate on mount
    calculateHeight()

    // Recalculate on window resize
    window.addEventListener('resize', calculateHeight)
    
    // Cleanup
    return () => window.removeEventListener('resize', calculateHeight)
  }, [])

  return (
    <main ref={mainRef} className="flex w-full min-h-screen overflow-x-hidden" style={{ paddingTop: `calc(var(--navbar-height, 72px) + 60px)` }}>
      <div className="flex flex-1 flex-col w-full px-4">
        <Tabs defaultValue="widgets" className="w-full h-full flex flex-col">
          {/* Fixed TabsList positioned under navbar */}
          <div 
            ref={tabsListRef}
            className="fixed top-0 left-0 right-0 z-40 bg-background border-b px-4 py-2"
            style={{ 
              top: 'var(--navbar-height, 72px)',
              paddingLeft: '1rem',
              paddingRight: '1rem'
            }}
          >
            <TabsList className="w-full max-w-none">
              <TabsTrigger value="widgets">{t('dashboard.tabs.widgets')}</TabsTrigger>
              <TabsTrigger value="table">{t('dashboard.tabs.table')}</TabsTrigger>
              <TabsTrigger value="accounts">{t('dashboard.tabs.accounts')}</TabsTrigger>
              <TabsTrigger value="analysis">{t('dashboard.tabs.analysis')}</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent 
            value="table" 
            className="flex-1"
          >
            <TradeTableReview />
          </TabsContent>
          
          <TabsContent
            value="accounts"
            className="flex-1"
          >
            <AccountsOverview size="large" />
          </TabsContent>
          
          <TabsContent
            value="analysis"
            className="flex-1"
          >
            <AnalysisOverview />
          </TabsContent>
          
          <TabsContent value="widgets" className="flex-1">
            <WidgetCanvas />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}