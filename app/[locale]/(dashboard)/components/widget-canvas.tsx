"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { EllipsisVertical, BarChart, BarChart2, LineChart, Calendar, Info, Minus, GripVertical, Maximize2, Minimize2, Square, Plus, Clock, Timer, ArrowLeftRight, PiggyBank, Award } from 'lucide-react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useUser } from '@/components/context/user-data'

import EquityChart from './charts/equity-chart'
import TickDistributionChart from './charts/tick-distribution'
import PNLChart from './charts/pnl-bar-chart'
import TimeOfDayTradeChart from './charts/pnl-time-bar-chart'
import TimeInPositionChart from './charts/time-in-position'
import WeekdayPNLChart from './charts/weekday-pnl'
import PnLBySideChart from './charts/pnl-by-side'
import { CalendarSection } from './sections/calendar-section'
import AveragePositionTimeCard from './statistics/average-position-time-card'
import CumulativePnlCard from './statistics/cumulative-pnl-card'
import LongShortPerformanceCard from './statistics/long-short-card'
import TradePerformanceCard from './statistics/trade-performance-card'
import WinningStreakCard from './statistics/winning-streak-card'
import { loadDashboardLayout, saveDashboardLayout } from '@/server/database'
import { Widget, WidgetType, WidgetSize, Layouts, LayoutState, LayoutItem } from '../types/dashboard'
import { useAutoScroll } from '../hooks/use-auto-scroll'
import CalendarPnl from './calendar/calendar-pnl'
import CommissionsPnLChart from './charts/commissions-pnl'
import StatisticsWidget from './statistics/statistics-widget'

interface WidgetOption {
  type: WidgetType
  label: string
  icon: React.ReactNode
  size: WidgetSize
}


function WidgetWrapper({ children, onRemove, onChangeType, onChangeSize, isCustomizing, size, currentType, dragHandleProps }: { 
  children: React.ReactNode
  onRemove: () => void
  onChangeType: (type: WidgetType) => void
  onChangeSize: (size: WidgetSize) => void
  isCustomizing: boolean
  size: WidgetSize
  currentType: WidgetType
  dragHandleProps?: any
}) {
  const isValidSize = (widgetType: WidgetType, size: WidgetSize) => {
    if (widgetType === 'calendarWidget') {
      return size === 'medium' || size === 'large'
    }
    return true
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border bg-background shadow transition-all no-select">
      {isCustomizing && (
        <div className="absolute left-2 top-2 z-50" {...dragHandleProps}>
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
        </div>
      )}
      <div className="h-full w-full">{children}</div>
      {isCustomizing && (
        <div className="absolute inset-0 bg-background/50 dark:bg-background/70 pointer-events-none" />
      )}
      {isCustomizing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="absolute right-2 top-2 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-popover/90 text-popover-foreground opacity-70 transition-opacity hover:opacity-100"
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover text-popover-foreground border-border z-50 max-h-[400px] overflow-y-auto">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center hover:bg-accent hover:text-accent-foreground">
                <Info className="mr-2 h-4 w-4" />
                <span>Edit Widget</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-popover text-popover-foreground border-border max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel>Charts</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => onChangeType('equityChart')}
                  className={`hover:bg-accent hover:text-accent-foreground ${
                    currentType === 'equityChart' ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <LineChart className="mr-2 h-4 w-4" />
                  <span>Equity Chart</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('pnlChart')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'pnlChart' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  <span>P&L Chart</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('timeOfDayChart')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'timeOfDayChart' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Time of Day</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('timeInPositionChart')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'timeInPositionChart' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <Timer className="mr-2 h-4 w-4" />
                  <span>Time in Position</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('weekdayPnlChart')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'weekdayPnlChart' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Weekday P&L</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('pnlBySideChart')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'pnlBySideChart' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  <span>P&L by Side</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('tickDistribution')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'tickDistribution' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  <span>Tick Distribution</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('commissionsPnl')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'commissionsPnl' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <PiggyBank className="mr-2 h-4 w-4" />
                  <span>Commissions PnL</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuLabel>Statistics</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => onChangeType('averagePositionTime')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'averagePositionTime' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Average Position Time</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('cumulativePnl')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'cumulativePnl' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <PiggyBank className="mr-2 h-4 w-4" />
                  <span>Cumulative PnL</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('longShortPerformance')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'longShortPerformance' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  <span>Long/Short Performance</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('tradePerformance')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'tradePerformance' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <BarChart className="mr-2 h-4 w-4" />
                  <span>Trade Performance</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('winningStreak')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'winningStreak' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <Award className="mr-2 h-4 w-4" />
                  <span>Winning Streak</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeType('statisticsWidget')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'statisticsWidget' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <BarChart2 className="mr-2 h-4 w-4" />
                  <span>Statistics Overview</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuLabel>Other</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => onChangeType('calendarWidget')}
                  className={`hover:bg-accent hover:text-accent-foreground ${currentType === 'calendarWidget' ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Calendar</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center hover:bg-accent hover:text-accent-foreground">
                <Maximize2 className="mr-2 h-4 w-4" />
                <span>Change Size</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-popover text-popover-foreground border-border">
                <DropdownMenuItem 
                  onClick={() => onChangeSize('small')}
                  className={`hover:bg-accent hover:text-accent-foreground ${
                    size === 'small' ? 'bg-accent text-accent-foreground' : ''
                  } ${!isValidSize(currentType, 'small') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isValidSize(currentType, 'small')}
                >
                  <Minimize2 className="mr-2 h-4 w-4" />
                  <span>Small (3x2)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeSize('small-long')}
                  className={`hover:bg-accent hover:text-accent-foreground ${
                    size === 'small-long' ? 'bg-accent text-accent-foreground' : ''
                  } ${!isValidSize(currentType, 'small-long') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isValidSize(currentType, 'small-long')}
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  <span>Small Long (6x2)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeSize('medium')}
                  className={`hover:bg-accent hover:text-accent-foreground ${
                    size === 'medium' ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <Square className="mr-2 h-4 w-4" />
                  <span>Medium (6x4)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onChangeSize('large')}
                  className={`hover:bg-accent hover:text-accent-foreground ${
                    size === 'large' ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  <span>Large (12x4)</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem 
              onClick={onRemove}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Minus className="mr-2 h-4 w-4" />
              <span>Remove Widget</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // matches our 'sm' breakpoint
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

export default function WidgetCanvas() {
  const { user } = useUser()
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), [])
  const isMobile = useIsMobile()
  
  const [layoutState, setLayoutState] = useState<LayoutState>({
    layouts: {
      desktop: [],
      mobile: []
    },
    activeLayout: 'desktop'
  })
  const [isCustomizing, setIsCustomizing] = useState(false)
  
  // Add this state to track if the layout change is from user interaction
  const [isUserAction, setIsUserAction] = useState(false)
  
  // Update sizeToGrid to handle responsive sizes
  const sizeToGrid = (size: WidgetSize, isSmallScreen = false): { w: number, h: number } => {
    if (isSmallScreen) {
      switch (size) {
        case 'small':
          return { w: 12, h: 2.5 }
        case 'small-long':
          return { w: 12, h: 4 }
        case 'medium':
          return { w: 12, h: 4.5 }
        case 'large':
          return { w: 12, h: 4 }
        default:
          return { w: 12, h: 4 }
      }
    }

    // Desktop sizes
    switch (size) {
      case 'small':
        return { w: 3, h: 2 }
      case 'small-long':
        return { w: 6, h: 2 }
      case 'medium':
        return { w: 6, h: 4 }
      case 'large':
        return { w: 12, h: 4 }
      default:
        return { w: 6, h: 4 }
    }
  }

  // Create layouts for different breakpoints
  const generateResponsiveLayout = (widgets: Widget[]) => {
    const layouts = {
      lg: widgets.map(widget => ({
        ...widget,
        ...sizeToGrid(widget.size)
      })),
      md: widgets.map(widget => ({
        ...widget,
        ...sizeToGrid(widget.size)
      })),
      sm: widgets.map(widget => ({
        ...widget,
        ...sizeToGrid(widget.size, true),
        w: 12, // Force full width
        x: 0 // Align to left
      })),
      xs: widgets.map(widget => ({
        ...widget,
        ...sizeToGrid(widget.size, true),
        w: 12, // Force full width
        x: 0 // Align to left
      })),
      xxs: widgets.map(widget => ({
        ...widget,
        ...sizeToGrid(widget.size, true),
        w: 12, // Force full width
        x: 0 // Align to left
      }))
    }
    return layouts
  }

  // Load widgets from database using server action
  useEffect(() => {
    async function loadLayout() {
      if (!user?.id) return
      
      try {
        const savedLayouts = await loadDashboardLayout(user.id)
        
        if (savedLayouts) {
          setLayoutState({
            layouts: savedLayouts as Layouts,
            activeLayout: isMobile ? 'mobile' : 'desktop'
          })
        } else {
          // Define default widgets for desktop
          const defaultDesktopWidgets = [
            { 
              i: 'widget1732477563848', 
              type: 'calendarWidget' as WidgetType, 
              size: 'medium' as WidgetSize, 
              x: 0, 
              y: 0,
              ...sizeToGrid('medium')
            },
            { 
              i: 'widget1732477566865', 
              type: 'equityChart' as WidgetType, 
              size: 'small-long' as WidgetSize, 
              x: 6, 
              y: 0,
              ...sizeToGrid('small-long')
            },
          ]

          // Define default widgets for mobile
          const defaultMobileWidgets = [
            {
              i: "widget1732478863259",
              type: "calendarWidget" as WidgetType,
              size: "medium" as WidgetSize,
              x: 0,
              y: 0,
              w: 12,
              h: 4
            },
            {
              i: "widget1732478800633",
              type: "equityChart" as WidgetType,
              size: "small" as WidgetSize,
              x: 0,
              y: 4.5,
              w: 12,
              h: 2
            },
            {
              i: "widget1732478839903",
              type: "tickDistribution" as WidgetType,
              size: "small" as WidgetSize,
              x: 0,
              y: 7,
              w: 12,
              h: 2
            },
            {
              i: "widget1732478848667",
              type: "pnlChart" as WidgetType,
              size: "small" as WidgetSize,
              x: 0,
              y: 9.5,
              w: 12,
              h: 2
            }
          ]

          // Generate responsive layouts for desktop
          const responsiveDesktopLayouts = generateResponsiveLayout(defaultDesktopWidgets)
          
          setLayoutState({
            layouts: {
              desktop: responsiveDesktopLayouts.lg,
              mobile: defaultMobileWidgets
            },
            activeLayout: isMobile ? 'mobile' : 'desktop'
          })
        }
      } catch (error) {
        console.error('Error loading dashboard layout:', error)
      }
    }

    loadLayout()
  }, [user?.id, isMobile])

  // Add auto-scroll functionality for mobile
  useAutoScroll(isMobile && isCustomizing)

  // Update handleLayoutChange
  const handleLayoutChange = async (layout: LayoutItem[], layouts: any) => {
    if (!user?.id || !isCustomizing) return

    const currentLayout = isMobile ? 'mobile' : 'desktop'
    const updatedWidgets = layoutState.layouts[currentLayout].map(widget => {
      const layoutItem = layout.find(item => item.i === widget.i)
      if (layoutItem) {
        if (isMobile) {
          return {
            ...widget,
            y: layoutItem.y,
            x: 0,
            w: 12,
          }
        }
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        }
      }
      return widget
    })

    const newLayouts = {
      ...layoutState.layouts,
      [currentLayout]: updatedWidgets
    }

    setLayoutState(prev => ({
      ...prev,
      layouts: newLayouts
    }))
    
    // Only save to database if it's a user action (drag/drop)
    if (isUserAction) {
      await saveDashboardLayout(user.id, newLayouts)
      setIsUserAction(false) // Reset the flag
    }
  }

  const addWidget = async (type: WidgetType, size: WidgetSize = 'small') => {
    if (!user?.id) return
    
    const effectiveSize = type === 'calendarWidget' ? 'medium' : size
    const currentLayout = layoutState.layouts[layoutState.activeLayout]
    
    // Calculate position for new widget
    let lastRowY = 0
    let rightmostX = 0
    
    currentLayout.forEach(widget => {
      if (widget.y >= lastRowY) {
        lastRowY = widget.y
        if (widget.x + widget.w > rightmostX) {
          rightmostX = widget.x + widget.w
        }
      }
    })

    const grid = sizeToGrid(effectiveSize)
    const newX = rightmostX + (rightmostX + grid.w > 12 ? -rightmostX : 0)
    const newY = rightmostX + grid.w > 12 ? lastRowY + grid.h : lastRowY

    const newWidget: Widget = {
      i: `widget${Date.now()}`,
      type,
      size: effectiveSize,
      x: newX,
      y: newY,
      w: grid.w, // Add w property
      h: grid.h  // Add h property
    }

    // Generate new responsive layouts including the new widget
    const updatedWidgets = [...currentLayout, newWidget]
    const responsiveLayouts = generateResponsiveLayout(updatedWidgets)
    
    const newLayouts = {
      ...layoutState.layouts,
      desktop: responsiveLayouts.lg,
      mobile: responsiveLayouts.sm
    }
    
    setLayoutState(prev => ({
      ...prev,
      layouts: newLayouts
    }))
    
    await saveDashboardLayout(user.id, newLayouts)
  }

  const removeWidget = async (i: string) => {
    if (!user?.id) return
    const updatedWidgets = layoutState.layouts[layoutState.activeLayout].filter(widget => widget.i !== i)
    const newLayouts = {
      ...layoutState.layouts,
      [layoutState.activeLayout]: updatedWidgets
    }
    setLayoutState(prev => ({
      ...prev,
      layouts: newLayouts
    }))
    await saveDashboardLayout(user.id, newLayouts)
  }

  const changeWidgetType = async (i: string, newType: WidgetType) => {
    if (!user?.id) return
    const updatedWidgets = layoutState.layouts[layoutState.activeLayout].map(widget => 
      widget.i === i ? { ...widget, type: newType } : widget
    )
    const newLayouts = {
      ...layoutState.layouts,
      [layoutState.activeLayout]: updatedWidgets
    }
    setLayoutState(prev => ({
      ...prev,
      layouts: newLayouts
    }))
    await saveDashboardLayout(user.id, newLayouts)
  }

  const changeWidgetSize = async (i: string, newSize: WidgetSize) => {
    if (!user?.id) return
    const grid = sizeToGrid(newSize)
    const updatedWidgets = layoutState.layouts[layoutState.activeLayout].map(widget => 
      widget.i === i ? { ...widget, size: newSize, ...grid } : widget
    )
    const newLayouts = {
      ...layoutState.layouts,
      [layoutState.activeLayout]: updatedWidgets
    }
    setLayoutState(prev => ({
      ...prev,
      layouts: newLayouts
    }))
    await saveDashboardLayout(user.id, newLayouts)
  }

  const renderWidget = (widget: Widget) => {
    // Always pass 'small' size on mobile
    const effectiveSize = isMobile ? 'small' : widget.size

    switch (widget.type) {
      case 'equityChart':
        return <EquityChart size={effectiveSize} />
      case 'pnlChart':
        return <PNLChart size={effectiveSize} />
      case 'timeOfDayChart':
        return <TimeOfDayTradeChart size={effectiveSize} />
      case 'timeInPositionChart':
        return <TimeInPositionChart size={effectiveSize} />
      case 'weekdayPnlChart':
        return <WeekdayPNLChart size={effectiveSize} />
      case 'pnlBySideChart':
        return <PnLBySideChart size={effectiveSize} />
      case 'tickDistribution':
        return <TickDistributionChart size={effectiveSize} />
      case 'commissionsPnl':
        return <CommissionsPnLChart size={effectiveSize} />
      case 'calendarWidget':
        return <CalendarPnl />
      case 'averagePositionTime':
        return <AveragePositionTimeCard />
      case 'cumulativePnl':
        return <CumulativePnlCard />
      case 'longShortPerformance':
        return <LongShortPerformanceCard />
      case 'tradePerformance':
        return <TradePerformanceCard />
      case 'winningStreak':
        return <WinningStreakCard />
      case 'statisticsWidget':
        return <StatisticsWidget size={effectiveSize} />
      default:
        return <PlaceholderWidget size={effectiveSize} />
    }
  }

  const removeAllWidgets = async () => {
    if (!user?.id) return
    
    const newLayouts = {
      ...layoutState.layouts,
      [layoutState.activeLayout]: []
    }
    
    setLayoutState(prev => ({
      ...prev,
      layouts: newLayouts
    }))
    
    await saveDashboardLayout(user.id, newLayouts)
  }

  return (
    <div className="p-4 no-select">
      <div className="mb-4 flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Widget
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover text-popover-foreground border-border max-h-[400px] overflow-y-auto">
            <DropdownMenuLabel>Charts</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('equityChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <LineChart className="mr-2 h-4 w-4" />
              <span>Equity Chart</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('pnlChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <BarChart className="mr-2 h-4 w-4" />
              <span>P&L Chart</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('timeOfDayChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Clock className="mr-2 h-4 w-4" />
              <span>Time of Day</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('timeInPositionChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Timer className="mr-2 h-4 w-4" />
              <span>Time in Position</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('weekdayPnlChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>Weekday P&L</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('pnlBySideChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              <span>P&L by Side</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('tickDistribution')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <BarChart className="mr-2 h-4 w-4" />
              <span>Tick Distribution</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('commissionsPnl')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <PiggyBank className="mr-2 h-4 w-4" />
              <span>Commissions PnL</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel>Statistics</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('averagePositionTime')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Clock className="mr-2 h-4 w-4" />
              <span>Average Position Time</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('cumulativePnl')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <PiggyBank className="mr-2 h-4 w-4" />
              <span>Cumulative PnL</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('longShortPerformance')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              <span>Long/Short Performance</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('tradePerformance')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <BarChart className="mr-2 h-4 w-4" />
              <span>Trade Performance</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('winningStreak')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Award className="mr-2 h-4 w-4" />
              <span>Winning Streak</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('statisticsWidget')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              <span>Statistics Overview</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel>Other</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('calendarWidget')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>Calendar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-4">
          {isCustomizing && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={removeAllWidgets}
              className="flex items-center gap-2"
            >
              <Minus className="h-4 w-4" />
              Remove All
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <Switch
              id="customize-mode"
              checked={isCustomizing}
              onCheckedChange={setIsCustomizing}
            />
            <label htmlFor="customize-mode">{isCustomizing ? 'Done' : 'Edit'}</label>
          </div>
        </div>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={generateResponsiveLayout(layoutState.layouts[layoutState.activeLayout])}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        rowHeight={isMobile ? 75 : 100}
        isDraggable={isCustomizing}
        isResizable={isCustomizing && !isMobile}
        onDragStart={() => setIsUserAction(true)}
        onResizeStart={() => setIsUserAction(true)}
        onLayoutChange={handleLayoutChange}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        draggableHandle=".cursor-move"
        style={{ 
          minHeight: isMobile ? '100vh' : 'auto',
          touchAction: isCustomizing ? 'none' : 'auto'
        }}
      >
        {layoutState.layouts[layoutState.activeLayout].map((widget) => (
          <div key={widget.i} className="bg-background">
            <WidgetWrapper
              onRemove={() => removeWidget(widget.i)}
              onChangeType={(type) => changeWidgetType(widget.i, type)}
              onChangeSize={(size) => changeWidgetSize(widget.i, size)}
              isCustomizing={isCustomizing}
              size={widget.size}
              currentType={widget.type}
            >
              {renderWidget(widget)}
            </WidgetWrapper>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}
