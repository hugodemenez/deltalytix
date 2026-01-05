'use client'

import React from 'react'
import {
  DailyPnLChartEmbed,
  TimeOfDayPerformanceChart,
  TimeInPositionByHourChart,
  PnLBySideChartEmbed,
  TradeDistributionChartEmbed,
  WeekdayPnLChartEmbed,
  PnLPerContractChartEmbed,
  PnLPerContractDailyChartEmbed,
  TickDistributionChartEmbed,
  CommissionsPnLEmbed,
  ContractQuantityChartEmbed,
  TimeRangePerformanceChart,
} from './index'
import { toast, Toaster } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { applyEmbedTheme, THEME_PRESETS, getOverridesFromSearchParams } from './theme'
import Script from 'next/script'
import { I18nProviderClient } from '@/locales/client'


// Removed ThemeProvider import - using simple theme implementation

// Mock trade data enriched with typical fields
const instruments = ['ES', 'NQ', 'CL', 'GC'] as const
const sides = ['long', 'short'] as const
const now = Date.now()
const dayMs = 24 * 60 * 60 * 1000
const mockTrades = Array.from({ length: 60 }, (_, i) => {
  const entry = new Date(now - Math.floor(Math.random() * 30) * dayMs - Math.floor(Math.random() * 24) * 3600 * 1000)
  const qty = Math.ceil(Math.random() * 3)
  const pnl = Math.round(((Math.random() - 0.4) * 500) * 100) / 100
  const timeInPosition = Math.floor(Math.random() * 3600)
  return {
    pnl,
    timeInPosition,
    entryDate: entry.toISOString(),
    side: sides[Math.floor(Math.random() * sides.length)],
    quantity: qty,
    commission: Math.round(qty * (1 + Math.random() * 3) * 100) / 100,
    instrument: instruments[Math.floor(Math.random() * instruments.length)],
  }
})

// Function to generate random trade data
function generateRandomTrade() {
  const qty = Math.ceil(Math.random() * 3)
  const pnl = (Math.random() - 0.4) * 500
  const timeInPosition = Math.random() * 3600
  const entry = new Date(Date.now() - Math.floor(Math.random() * 20) * dayMs)
  return {
    pnl: Math.round(pnl * 100) / 100,
    timeInPosition: Math.round(timeInPosition),
    entryDate: entry.toISOString(),
    side: sides[Math.floor(Math.random() * sides.length)],
    quantity: qty,
    commission: Math.round(qty * (1 + Math.random() * 3) * 100) / 100,
    instrument: instruments[Math.floor(Math.random() * instruments.length)],
  }
}

// Function to generate multiple random trades
function generateRandomTrades(count: number = 1) {
    return Array.from({ length: count }, generateRandomTrade)
}
export default function EmbedPage() {
    const searchParams = useSearchParams()
    const theme = searchParams.get('theme') || 'dark'
    const preset = searchParams.get('preset') || undefined
    const lang = searchParams.get('lang') || 'en'
    const [trades, setTrades] = React.useState<any[]>(mockTrades)

    // Simple theme + preset + overrides application without context
    React.useEffect(() => {
        const root = document.documentElement
        root.classList.remove('light', 'dark')

        let effectiveTheme: 'light' | 'dark' = 'light'
        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        } else if (theme === 'light' || theme === 'dark') {
            effectiveTheme = theme
        } else {
            // If theme is a non-standard string, default to light but still allow presets/overrides
            effectiveTheme = 'light'
        }

        root.classList.add(effectiveTheme)

        // Apply optional preset (ocean, sunset, etc.) on top of light/dark
        if (preset && THEME_PRESETS[preset as keyof typeof THEME_PRESETS]) {
            applyEmbedTheme(THEME_PRESETS[preset as keyof typeof THEME_PRESETS], root)
        }

        // Apply explicit overrides from query params last
        const overrides = getOverridesFromSearchParams(searchParams)
        if (Object.keys(overrides).length > 0) {
            applyEmbedTheme(overrides, root)
        }

        // Listen for system theme changes when theme is 'system'
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = () => {
                root.classList.remove('light', 'dark')
                const newEffectiveTheme = mediaQuery.matches ? 'dark' : 'light'
                root.classList.add(newEffectiveTheme)

                // Re-apply preset and overrides after class change to ensure they persist
                if (preset && THEME_PRESETS[preset as keyof typeof THEME_PRESETS]) {
                    applyEmbedTheme(THEME_PRESETS[preset as keyof typeof THEME_PRESETS], root)
                }
                const newOverrides = getOverridesFromSearchParams(searchParams)
                if (Object.keys(newOverrides).length > 0) {
                    applyEmbedTheme(newOverrides, root)
                }
            }

            mediaQuery.addEventListener('change', handleChange)
            return () => mediaQuery.removeEventListener('change', handleChange)
        }
    }, [theme, preset, searchParams])

    // Message listener for iframe communication
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data

                if (data.type === 'ADD_TRADES') {
                    const { count = 1, trades: newTrades } = data

                    if (newTrades && Array.isArray(newTrades)) {
                        // Add provided trades
                        setTrades(prev => [...prev, ...newTrades])
                    } else {
                        toast.error('No trades provided', { description: `Generating ${count} random trades` })
                        // Generate random trades
                        const randomTrades = generateRandomTrades(count)
                        setTrades(prev => [...prev, ...randomTrades])
                    }
                } else if (data.type === 'RESET_TRADES') {
                    // Reset to original mock data
                    setTrades(mockTrades)
                } else if (data.type === 'CLEAR_TRADES') {
                    // Clear all trades
                    setTrades([])
                } else if (data.type === 'SET_THEME') {
                    const root = document.documentElement
                    const { themeMode, preset: p, vars } = data
                    if (themeMode === 'light' || themeMode === 'dark') {
                        root.classList.remove('light', 'dark')
                        root.classList.add(themeMode)
                    }
                    if (p && THEME_PRESETS[p as keyof typeof THEME_PRESETS]) {
                        applyEmbedTheme(THEME_PRESETS[p as keyof typeof THEME_PRESETS], root)
                    }
                    if (vars && typeof vars === 'object') {
                        applyEmbedTheme(vars, root)
                    }
                }
            } catch (error) {
                toast.error('Error processing message', { description: error instanceof Error ? error.message : 'Unknown error' })
            }
        }

        window.addEventListener('message', handleMessage)

        return () => {
            window.removeEventListener('message', handleMessage)
        }
    }, [])

    const selectedInstrument = React.useMemo(() => {
      const counts: Record<string, number> = {}
      trades.forEach((t) => {
        if (!t.instrument) return
        counts[t.instrument] = (counts[t.instrument] || 0) + 1
      })
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || instruments[0]
    }, [trades])

    // Parse chart selection via search params: `charts`
    const chartParam = searchParams.get('charts') || 'all'
    const selectedCharts = React.useMemo(() => {
      if (!chartParam || chartParam.toLowerCase() === 'all') return null
      const set = new Set(
        chartParam
          .split(',')
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean)
      )
      return set.size ? set : null
    }, [chartParam])

    const chartDefinitions = React.useMemo(() => (
      [
        { key: 'time-range-performance', render: () => <TimeRangePerformanceChart trades={trades} /> },
        { key: 'daily-pnl', render: () => <DailyPnLChartEmbed trades={trades} /> },
        { key: 'time-of-day', render: () => <TimeOfDayPerformanceChart trades={trades} /> },
        { key: 'time-in-position', render: () => <TimeInPositionByHourChart trades={trades} /> },
        { key: 'pnl-by-side', render: () => <PnLBySideChartEmbed trades={trades} /> },
        { key: 'trade-distribution', render: () => <TradeDistributionChartEmbed trades={trades} /> },
        { key: 'weekday-pnl', render: () => <WeekdayPnLChartEmbed trades={trades} /> },
        { key: 'pnl-per-contract', render: () => <PnLPerContractChartEmbed trades={trades} /> },
        { key: 'pnl-per-contract-daily', render: () => <PnLPerContractDailyChartEmbed trades={trades} instrument={selectedInstrument} /> },
        { key: 'tick-distribution', render: () => <TickDistributionChartEmbed trades={trades} /> },
        { key: 'commissions-pnl', render: () => <CommissionsPnLEmbed trades={trades} /> },
        { key: 'contract-quantity', render: () => <ContractQuantityChartEmbed trades={trades} /> },
      ]
    ), [trades, selectedInstrument])

    // Function to send chart click message to parent
    const sendChartClickMessage = React.useCallback((chartKey: string, chartName: string) => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'CHART_CLICKED',
          chartKey,
          chartName
        }, '*')
      }
    }, [])

    const chartsToRender = React.useMemo(() => {
      const filtered = chartDefinitions.filter((c) => !selectedCharts || selectedCharts.has(c.key))
      // If selection was provided but no keys matched, fall back to all
      return (selectedCharts && filtered.length === 0 ? chartDefinitions : filtered).map((component) => (
        <div 
          key={component.key}
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => {
            const chartName = component.key.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
            sendChartClickMessage(component.key, chartName)
          }}
          title={`Click to add "${component.key.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}" to selection`}
        >
          {component.render()}
        </div>
      ))
    }, [chartDefinitions, selectedCharts, sendChartClickMessage])

    return (
      <I18nProviderClient locale={lang}>
        <div className="w-full h-full min-h-[400px] mb-20">
          {/*Dismiss cookie consent banner*/}
          <Script id="embed-autoconsent" strategy="beforeInteractive">
          {`try {
            if (!window.localStorage.getItem('cookieConsent')) {
              window.localStorage.setItem('cookieConsent', JSON.stringify({
                analytics_storage: false,
                ad_storage: false,
                ad_user_data: false,
                ad_personalization: false,
                functionality_storage: true,
                personalization_storage: false,
                security_storage: true
              }))
            }
          } catch (e) {}`
          }
          </Script>

          <Toaster />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {chartsToRender}
          </div>
        </div>
      </I18nProviderClient>
    )
}