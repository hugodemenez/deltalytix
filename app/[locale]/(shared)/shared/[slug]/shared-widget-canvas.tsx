'use client'

import React, { useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useI18n } from "@/locales/client"
import EquityChart from '@/app/[locale]/(dashboard)/components/charts/equity-chart'
import PNLChart from '@/app/[locale]/(dashboard)/components/charts/pnl-bar-chart'
import { Widget, WidgetType, WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'
import CalendarPnl from '@/app/[locale]/(dashboard)/components/calendar/calendar-pnl'
import CumulativePnlCard from '@/app/[locale]/(dashboard)/components/statistics/cumulative-pnl-card'
import TradePerformanceCard from '@/app/[locale]/(dashboard)/components/statistics/trade-performance-card'
import LongShortPerformanceCard from '@/app/[locale]/(dashboard)/components/statistics/long-short-card'
import AveragePositionTimeCard from '@/app/[locale]/(dashboard)/components/statistics/average-position-time-card'
import { cn } from '@/lib/utils'

interface SharedWidgetCanvasProps {
  layout?: any // Make layout optional since we'll use fixed layout
}

function PlaceholderWidget({ size }: { size: WidgetSize }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Placeholder Widget ({size})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-full bg-gray-200 flex items-center justify-center">
          This is a {size} placeholder widget
        </div>
      </CardContent>
    </Card>
  )
}

// Add a hook to track screen size
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // matches our 'sm' breakpoint
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

// Define our fixed layouts
const DEFAULT_LAYOUTS = {
  desktop: [
    {
      i: "widget1732477563848",
      type: "calendarWidget" as WidgetType,
      size: "large" as WidgetSize,
      x: 0,
      y: 1,
      w: 6,
      h: 8
    },
    {
      i: "widget1732477566865",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 6,
      y: 1,
      w: 6,
      h: 4
    },
    {
      i: "widget1734881236127",
      type: "pnlChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 6,
      y: 5,
      w: 6,
      h: 4
    },
    {
      i: "widget1734881247979",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "widget1734881251266",
      type: "longShortPerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 3,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "widget1734881254352",
      type: "tradePerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 6,
      y: 0,
      w: 3,
      h: 1
    },
    {
      i: "widget1734881263452",
      type: "averagePositionTime" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 9,
      y: 0,
      w: 3,
      h: 1
    }
  ] as Widget[],
  mobile: [
    {
      i: "widget1732477563848",
      type: "calendarWidget" as WidgetType,
      size: "large" as WidgetSize,
      x: 0,
      y: 2,
      w: 12,
      h: 6
    },
    {
      i: "widget1732477566865",
      type: "equityChart" as WidgetType,
      size: "medium" as WidgetSize,
      x: 0,
      y: 8,
      w: 12,
      h: 6
    },
    {
      i: "widget1734881247979",
      type: "cumulativePnl" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 0,
      w: 12,
      h: 1
    },
    {
      i: "widget1734881254352",
      type: "tradePerformance" as WidgetType,
      size: "tiny" as WidgetSize,
      x: 0,
      y: 1,
      w: 12,
      h: 1
    }
  ] as Widget[]
}

export function SharedWidgetCanvas({ layout }: SharedWidgetCanvasProps) {
  const t = useI18n()
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), [])
  const isMobile = useIsMobile()

  const renderWidget = (widget: Widget) => {
    // For charts, ensure size is at least small-long
    const effectiveSize = (() => {
      // Calendar is always large
      if (widget.type === 'calendarWidget') {
        return 'large' as const
      }
      // Statistics widgets are always tiny
      if (['cumulativePnl', 'longShortPerformance', 'tradePerformance', 
           'averagePositionTime'].includes(widget.type)) {
        return 'tiny' as const
      }
      // Charts can be medium or large
      if (widget.type === 'equityChart' || widget.type === 'pnlChart') {
        if (widget.size === 'tiny') {
          return 'small-long' as const
        }
      }
      return isMobile && widget.size !== 'tiny' ? 'small' : widget.size
    })()

    switch (widget.type) {
      case 'equityChart':
        return <EquityChart size={effectiveSize} />
      case 'pnlChart':
        return <PNLChart size={effectiveSize} />
      case 'calendarWidget':
        return <CalendarPnl />
      case 'cumulativePnl':
        return <CumulativePnlCard size={effectiveSize} />
      case 'longShortPerformance':
        return <LongShortPerformanceCard size={effectiveSize} />
      case 'tradePerformance':
        return <TradePerformanceCard size={effectiveSize} />
      case 'averagePositionTime':
        return <AveragePositionTimeCard size={effectiveSize} />
      default:
        return <PlaceholderWidget size={effectiveSize} />
    }
  }

  const currentLayoutWidgets = DEFAULT_LAYOUTS[isMobile ? 'mobile' : 'desktop']

  // Create layouts for different breakpoints
  const generateResponsiveLayout = (widgets: Widget[]) => {
    const layouts = {
      lg: widgets.map(widget => ({
        ...widget,
        isDraggable: false,
        isResizable: false
      })),
      md: widgets.map(widget => ({
        ...widget,
        isDraggable: false,
        isResizable: false
      })),
      sm: widgets.map(widget => ({
        ...widget,
        isDraggable: false,
        isResizable: false,
        x: 0 // Align to left
      })),
      xs: widgets.map(widget => ({
        ...widget,
        isDraggable: false,
        isResizable: false,
        x: 0 // Align to left
      })),
      xxs: widgets.map(widget => ({
        ...widget,
        isDraggable: false,
        isResizable: false,
        x: 0 // Align to left
      }))
    }
    return layouts
  }

  return (
    <div className="relative mt-6">
      <ResponsiveGridLayout
        className="layout"
        layouts={generateResponsiveLayout(currentLayoutWidgets)}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        rowHeight={isMobile ? 65 : 70}
        isDraggable={false}
        isResizable={false}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        style={{ 
          minHeight: isMobile ? '100vh' : 'auto'
        }}
      >
        {currentLayoutWidgets.map((widget: Widget) => (
          <div key={widget.i} className="h-full">
            <div className="relative h-full w-full overflow-hidden rounded-lg bg-background shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
              {renderWidget(widget)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
} 