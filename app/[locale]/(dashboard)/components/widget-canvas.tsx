"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { BarChart, BarChart2, LineChart, Calendar, Info, Minus, Maximize2, Minimize2, Square, Plus, Clock, Timer, ArrowLeftRight, PiggyBank, Award, GripVertical, Table2, MoreVertical, Smile, MessageSquare } from 'lucide-react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useUser } from '@/components/context/user-data'
import { useI18n } from "@/locales/client"
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
import { Widget, WidgetType, WidgetSize, ChartSize, Layouts, LayoutState, LayoutItem } from '../types/dashboard'
import { useAutoScroll } from '../hooks/use-auto-scroll'
import CalendarPnl from './calendar/calendar-pnl'
import CommissionsPnLChart from './charts/commissions-pnl'
import StatisticsWidget from './statistics/statistics-widget'
import { cn } from '@/lib/utils'
import { TradeTableReview } from './tables/trade-table-review'
import { MoodSelector } from './calendar/mood-selector'
import ChatWidget from './chat-widget'
import { NewsWidget } from './market/news-widget'

interface WidgetOption {
  type: WidgetType
  label: string
  icon: React.ReactNode
  size: WidgetSize
}

function WidgetWrapper({ children, onRemove, onChangeType, onChangeSize, isCustomizing, size, currentType, onCustomize }: { 
  children: React.ReactNode
  onRemove: () => void
  onChangeType: (type: WidgetType) => void
  onChangeSize: (size: WidgetSize) => void
  isCustomizing: boolean
  size: WidgetSize
  currentType: WidgetType
  onCustomize: () => void
}) {
  const  t  = useI18n()
  const isMobile = useIsMobile()
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const contextButtonRef = useRef<HTMLButtonElement>(null)

  // Add touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isCustomizing) {
      // Prevent default touch behavior when customizing
      e.preventDefault()
    }
  }

  // Add check for fixed size widgets
  const hasFixedSize = currentType === 'chatWidget' || currentType === 'newsWidget'

  const isValidSize = (widgetType: WidgetType, size: WidgetSize) => {
    if (isMobile) {
      // On mobile, only allow tiny (shown as Small), medium (shown as Medium), and large (shown as Large)
      if (size === 'small' || size === 'small-long') return false
      
      // Statistics widgets and mood selector can only be tiny (Small)
      if (['statisticsWidget', 'averagePositionTime', 'cumulativePnl', 
           'longShortPerformance', 'tradePerformance', 'winningStreak',
           'moodSelector'].includes(widgetType)) {
        return size === 'tiny'
      }
      
      // Calendar and trade table widgets can only be large
      if (widgetType === 'calendarWidget' || widgetType === 'tradeTableReview') {
        return size === 'large'
      }
      
      // Chat widget can only be medium or large
      if (widgetType === 'chatWidget') {
        return size === 'large'
      }
      
      // Charts can be medium or large
      if (widgetType.includes('Chart') || widgetType === 'tickDistribution' || 
          widgetType === 'commissionsPnl') {
        return size === 'medium' || size === 'large'
      }
    } else {
      // Desktop view
      // Calendar and trade table widgets can only be large
      if (widgetType === 'calendarWidget' || widgetType === 'tradeTableReview') {
        return size === 'large'
      }
      
      // Statistics widgets and mood selector can only be tiny
      if (['statisticsWidget', 'averagePositionTime', 'cumulativePnl', 
           'longShortPerformance', 'tradePerformance', 'winningStreak',
           'moodSelector'].includes(widgetType)) {
        return size === 'tiny'
      }
      
      // Chat widget can only be medium or large
      if (widgetType === 'chatWidget') {
        return size === 'large'
      }
      
      // Charts can be small, medium or large
      if (widgetType.includes('Chart') || widgetType === 'tickDistribution' || 
          widgetType === 'commissionsPnl') {
        return size === 'small' || size === 'medium' || size === 'large'
      }
    }
    
    return true
  }

  return (
    <ContextMenu onOpenChange={setIsContextMenuOpen}>
      <ContextMenuTrigger asChild>
        <div 
          className="relative h-full w-full overflow-hidden rounded-lg bg-background shadow-[0_2px_4px_rgba(0,0,0,0.05)] group"
          onTouchStart={handleTouchStart}
        >
          <div className={cn("h-full w-full transition-all duration-200", 
            isCustomizing && "group-hover:blur-[2px]"
          )}>
            {children}
          </div>
          {isCustomizing && (
            <>
              <div className="absolute inset-0 border-2 border-dashed border-transparent group-hover:border-accent group-focus-within:border-accent transition-colors duration-200" />
              <div className="absolute inset-0 bg-background/50 dark:bg-background/70 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 drag-handle cursor-grab active:cursor-grabbing">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-6 w-4" />
                  <p className="text-sm font-medium">{t('widgets.dragToMove')}</p>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-10">
                <Button
                  ref={contextButtonRef}
                  variant="outline"
                  size="icon"
                  className={cn(
                    "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    isContextMenuOpen && "bg-accent text-accent-foreground"
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const rect = contextButtonRef.current?.getBoundingClientRect()
                    if (rect) {
                      const event = new MouseEvent('contextmenu', {
                        bubbles: true,
                        clientX: rect.left,
                        clientY: rect.bottom
                      })
                      contextButtonRef.current?.dispatchEvent(event)
                    }
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('widgets.removeWidgetConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('widgets.removeWidgetDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('widgets.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={onRemove}>{t('widgets.removeWidget')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem 
          onClick={onCustomize}
          className="hover:bg-accent hover:text-accent-foreground"
        >
          <GripVertical className="mr-2 h-4 w-4" />
          <span>{t('widgets.move')}</span>
        </ContextMenuItem>
        {!hasFixedSize && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="flex items-center">
                <Maximize2 className="mr-2 h-4 w-4" />
                <span>{t('widgets.changeSize')}</span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {isMobile ? (
                  <>
                    <ContextMenuItem 
                      onClick={() => onChangeSize('tiny')}
                      className={size === 'tiny' ? 'bg-accent text-accent-foreground' : ''}
                      disabled={!isValidSize(currentType, 'tiny')}
                    >
                      <Minimize2 className="mr-2 h-4 w-4" />
                      <span>{t('widgets.size.mobile.small')}</span>
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => onChangeSize('medium')}
                      className={size === 'medium' ? 'bg-accent text-accent-foreground' : ''}
                      disabled={!isValidSize(currentType, 'medium')}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      <span>{t('widgets.size.mobile.medium')}</span>
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => onChangeSize('large')}
                      className={size === 'large' ? 'bg-accent text-accent-foreground' : ''}
                      disabled={!isValidSize(currentType, 'large')}
                    >
                      <Maximize2 className="mr-2 h-4 w-4" />
                      <span>{t('widgets.size.mobile.large')}</span>
                    </ContextMenuItem>
                  </>
                ) : (
                  <>
                    <ContextMenuItem 
                      onClick={() => onChangeSize('tiny')}
                      className={size === 'tiny' ? 'bg-accent text-accent-foreground' : ''}
                      disabled={!isValidSize(currentType, 'tiny')}
                    >
                      <Minimize2 className="mr-2 h-4 w-4" />
                      <span>{t('widgets.size.tiny')}</span>
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => onChangeSize('small')}
                      className={size === 'small' ? 'bg-accent text-accent-foreground' : ''}
                      disabled={!isValidSize(currentType, 'small')}
                    >
                      <Minimize2 className="mr-2 h-4 w-4" />
                      <span>{t('widgets.size.small')}</span>
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => onChangeSize('medium')}
                      className={size === 'medium' ? 'bg-accent text-accent-foreground' : ''}
                      disabled={!isValidSize(currentType, 'medium')}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      <span>{t('widgets.size.medium')}</span>
                    </ContextMenuItem>
                    <ContextMenuItem 
                      onClick={() => onChangeSize('large')}
                      className={size === 'large' ? 'bg-accent text-accent-foreground' : ''}
                      disabled={!isValidSize(currentType, 'large')}
                    >
                      <Maximize2 className="mr-2 h-4 w-4" />
                      <span>{t('widgets.size.large')}</span>
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
        <ContextMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <ContextMenuItem 
              className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault()
              }}
            >
              <Minus className="mr-2 h-4 w-4" />
              <span>{t('widgets.remove')}</span>
            </ContextMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('widgets.removeWidgetConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('widgets.removeWidgetDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('widgets.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={onRemove}>{t('widgets.removeWidget')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ContextMenuContent>
    </ContextMenu>
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

// Add custom CSS for the placeholder
const customStyles = `
  .react-grid-placeholder {
    background: hsl(var(--accent) / 0.4) !important;
    border: 2px dashed hsl(var(--accent)) !important;
    border-radius: 0.5rem !important;
    opacity: 1 !important;
    transition: all 200ms ease !important;
    backdrop-filter: blur(4px) !important;
    box-shadow: 0 0 0 1px hsl(var(--accent) / 0.4) !important;
  }
  .react-grid-item.react-grid-placeholder {
    box-shadow: 0 0 0 1px hsl(var(--accent) / 0.2) !important;
    transform-origin: center !important;
  }
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
  .react-grid-item.react-draggable-dragging {
    transition: none !important;
    z-index: 100;
    cursor: grabbing !important;
    opacity: 0.9 !important;
  }
  .react-grid-item > .react-resizable-handle {
    border-radius: 0 0 4px 0;
  }
  
  /* Prevent text selection on mobile */
  @media (max-width: 768px) {
    .react-grid-item {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      touch-action: none;
    }
    
    /* Allow scrolling on content that needs it */
    .react-grid-item [data-scrollable="true"] {
      touch-action: pan-y;
      -webkit-overflow-scrolling: touch;
    }
  }
`

export default function WidgetCanvas() {
  const  t = useI18n()
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
  const [isRemoveAllDialogOpen, setIsRemoveAllDialogOpen] = useState(false)
  
  // Add this state to track if the layout change is from user interaction
  const [isUserAction, setIsUserAction] = useState(false)

  // Add click outside handler
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    // Check if the click is on a widget or its children
    const isWidgetClick = (e.target as HTMLElement).closest('.react-grid-item')
    const isContextMenuClick = (e.target as HTMLElement).closest('[role="menu"]')
    const isCustomizationSwitchClick = (e.target as HTMLElement).closest('#customize-mode')
    const isDialogClick = (e.target as HTMLElement).closest('[role="dialog"]')
    const isDialogTriggerClick = (e.target as HTMLElement).closest('[data-state="open"]')

    // If click is outside widgets and not on context menu, customization switch, or dialog elements, turn off customization
    if (!isWidgetClick && !isContextMenuClick && !isCustomizationSwitchClick && !isDialogClick && !isDialogTriggerClick) {
      setIsCustomizing(false)
    }
  }, [])

  useEffect(() => {
    if (isCustomizing) {
      document.addEventListener('click', handleOutsideClick)
      return () => document.removeEventListener('click', handleOutsideClick)
    }
  }, [isCustomizing, handleOutsideClick])

  // Update sizeToGrid to handle responsive sizes
  const sizeToGrid = (size: WidgetSize, isSmallScreen = false): { w: number, h: number } => {
    if (isSmallScreen) {
      switch (size) {
        case 'tiny':
          return { w: 12, h: 1 } // Only for statistics widgets
        case 'small':
          return { w: 12, h: 2 } // Only for statistics widgets
        case 'small-long':
          return { w: 12, h: 2 }
        case 'medium':
          return { w: 12, h: 4 }
        case 'large':
          return { w: 12, h: 6 }
        default:
          return { w: 12, h: 4 }
      }
    }

    // Desktop sizes
    switch (size) {
      case 'tiny':
        return { w: 3, h: 1 } // Only for statistics widgets
      case 'small':
        return { w: 3, h: 4 } // Only for statistics widgets
      case 'small-long':
        return { w: 6, h: 2 }
      case 'medium':
        return { w: 6, h: 4 }
      case 'large':
        return { w: 6, h: 8 }
      default:
        return { w: 6, h: 4 }
    }
  }

  // Add a function to get grid dimensions based on widget type and size
  const getWidgetGrid = (type: WidgetType, size: WidgetSize, isSmallScreen = false): { w: number, h: number } => {
    // Special case for chat widget and news widget - use small width but large height
    if (type === 'chatWidget' || type === 'newsWidget') {
      if (isSmallScreen) {
        return { w: 12, h: 6 } // Full width on mobile but same height as large
      }
      return { w: 3, h: 8 } // Same width as small (3 columns) but same height as large on desktop
    }
    
    return sizeToGrid(size, isSmallScreen)
  }

  // Create layouts for different breakpoints
  const generateResponsiveLayout = useCallback((widgets: Widget[]) => {
    const layouts = {
      lg: widgets.map(widget => ({
        ...widget,
        ...getWidgetGrid(widget.type, widget.size)
      })),
      md: widgets.map(widget => ({
        ...widget,
        ...getWidgetGrid(widget.type, widget.size)
      })),
      sm: widgets.map(widget => ({
        ...widget,
        ...getWidgetGrid(widget.type, widget.size, true),
        x: 0 // Align to left
      })),
      xs: widgets.map(widget => ({
        ...widget,
        ...getWidgetGrid(widget.type, widget.size, true),
        x: 0 // Align to left
      })),
      xxs: widgets.map(widget => ({
        ...widget,
        ...getWidgetGrid(widget.type, widget.size, true),
        x: 0 // Align to left
      }))
    }
    return layouts
  }, [])

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
          ]

          // Define default widgets for mobile
          const defaultMobileWidgets = [
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
  }, [user?.id, isMobile, generateResponsiveLayout])

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

  const addWidget = async (type: WidgetType, size: WidgetSize = 'medium') => {
    if (!user?.id) return
    
    // Determine default size based on widget type
    let effectiveSize = size
    // Calendar and trade table widgets are always large
    if (type === 'calendarWidget' || type === 'tradeTableReview') {
      effectiveSize = 'large'
    }
    // Statistics widgets are always tiny
    else if (['statisticsWidget', 'averagePositionTime', 'cumulativePnl', 
         'longShortPerformance', 'tradePerformance', 'winningStreak'].includes(type)) {
      effectiveSize = 'tiny'
    }
    // Chat and news widgets are always medium
    else if (['chatWidget', 'newsWidget'].includes(type)) {
      effectiveSize = 'medium'
    }
    // Charts default to medium
    else if (type.includes('Chart') || type === 'tickDistribution' || 
             type === 'commissionsPnl') {
      effectiveSize = 'medium'
    }
    
    const currentLayout = layoutState.layouts[layoutState.activeLayout]
    const grid = sizeToGrid(effectiveSize, layoutState.activeLayout === 'mobile')
    
    // Initialize variables for finding the best position
    let bestX = 0
    let bestY = 0
    let lowestY = 0
    
    // Find the lowest Y coordinate in the current layout
    currentLayout.forEach(widget => {
      const widgetBottom = widget.y + widget.h
      if (widgetBottom > lowestY) {
        lowestY = widgetBottom
      }
    })
    
    // First, try to find gaps in existing rows
    for (let y = 0; y <= lowestY; y++) {
      // Create an array representing occupied spaces at this Y level
      const rowOccupancy = new Array(12).fill(false)
      
      // Mark occupied spaces
      currentLayout.forEach(widget => {
        if (y >= widget.y && y < widget.y + widget.h) {
          for (let x = widget.x; x < widget.x + widget.w; x++) {
            rowOccupancy[x] = true
          }
        }
      })
      
      // Look for a gap large enough for the new widget
      for (let x = 0; x <= 12 - grid.w; x++) {
        let hasSpace = true
        for (let wx = 0; wx < grid.w; wx++) {
          if (rowOccupancy[x + wx]) {
            hasSpace = false
            break
          }
        }
        
        if (hasSpace) {
          // Check if there's enough vertical space
          let hasVerticalSpace = true
          for (let wy = 0; wy < grid.h; wy++) {
            currentLayout.forEach(widget => {
              if (widget.x < x + grid.w && 
                  widget.x + widget.w > x && 
                  widget.y <= y + wy && 
                  widget.y + widget.h > y + wy) {
                hasVerticalSpace = false
              }
            })
          }
          
          if (hasVerticalSpace) {
            bestX = x
            bestY = y
            // Found a suitable gap, use it immediately
            const newWidget: Widget = {
              i: `widget${Date.now()}`,
              type,
              size: effectiveSize,
              x: bestX,
              y: bestY,
              w: grid.w,
              h: grid.h
            }

            const updatedWidgets = [...currentLayout, newWidget]
            
            const newLayouts = {
              ...layoutState.layouts,
              [layoutState.activeLayout]: updatedWidgets
            }
            
            setLayoutState(prev => ({
              ...prev,
              layouts: newLayouts
            }))
            
            await saveDashboardLayout(user.id, newLayouts)
            return
          }
        }
      }
    }
    
    // If no suitable gap was found, add to the bottom
    const newWidget: Widget = {
      i: `widget${Date.now()}`,
      type,
      size: effectiveSize,
      x: 0,
      y: lowestY,
      w: grid.w,
      h: grid.h
    }

    const updatedWidgets = [...currentLayout, newWidget]
    
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
    
    // Find the widget
    const widget = layoutState.layouts[layoutState.activeLayout].find(w => w.i === i)
    if (!widget) return
    
    // Prevent charts from being set to tiny size
    let effectiveSize = newSize
    if (widget.type.includes('Chart') && newSize === 'tiny') {
      effectiveSize = 'medium'
    }
    
    const grid = sizeToGrid(effectiveSize)
    const updatedWidgets = layoutState.layouts[layoutState.activeLayout].map(widget => 
      widget.i === i ? { ...widget, size: effectiveSize, ...grid } : widget
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
    // For charts, ensure size is at least small-long
    const effectiveSize = (() => {
      // Calendar and trade table are always large
      if (widget.type === 'calendarWidget' || widget.type === 'tradeTableReview') {
        return 'large' as const
      }
      // Statistics widgets and mood selector are always tiny
      if (['statisticsWidget', 'averagePositionTime', 'cumulativePnl', 
           'longShortPerformance', 'tradePerformance', 'winningStreak',
           'moodSelector'].includes(widget.type)) {
        return 'tiny' as const
      }
      // Charts can be medium or large
      if (widget.type.includes('Chart') || widget.type === 'tickDistribution' || 
          widget.type === 'commissionsPnl') {
        if (widget.size === 'tiny') {
          return 'small-long' as const
        }
      }
      return isMobile && widget.size !== 'tiny' ? 'small' : widget.size
    })()

    switch (widget.type) {
      case 'equityChart':
        return <EquityChart size={effectiveSize as ChartSize} />
      case 'pnlChart':
        return <PNLChart size={effectiveSize as ChartSize} />
      case 'timeOfDayChart':
        return <TimeOfDayTradeChart size={effectiveSize as ChartSize} />
      case 'timeInPositionChart':
        return <TimeInPositionChart size={effectiveSize as ChartSize} />
      case 'weekdayPnlChart':
        return <WeekdayPNLChart size={effectiveSize as ChartSize} />
      case 'pnlBySideChart':
        return <PnLBySideChart size={effectiveSize as ChartSize} />
      case 'tickDistribution':
        return <TickDistributionChart size={effectiveSize as ChartSize} />
      case 'commissionsPnl':
        return <CommissionsPnLChart size={effectiveSize as ChartSize} />
      case 'calendarWidget':
        return <CalendarPnl />
      case 'averagePositionTime':
        return <AveragePositionTimeCard size={effectiveSize} />
      case 'cumulativePnl':
        return <CumulativePnlCard size={effectiveSize} />
      case 'longShortPerformance':
        return <LongShortPerformanceCard size={effectiveSize} />
      case 'tradePerformance':
        return <TradePerformanceCard size={effectiveSize} />
      case 'winningStreak':
        return <WinningStreakCard size={effectiveSize} />
      case 'statisticsWidget':
        return <StatisticsWidget size={effectiveSize} />
      case 'tradeTableReview':
        return <TradeTableReview />
      case 'moodSelector':
        return <MoodSelector onMoodSelect={(mood) => console.log('Selected mood:', mood)} />
      case 'chatWidget':
      case 'newsWidget': {
        const containerClasses = cn(
          "h-full w-full",
          "flex items-center justify-center",
          isMobile ? "px-4" : ""
        )
        const widgetClasses = cn(
          "h-full w-full",
          isMobile ? "max-w-[500px]" : ""
        )
        return (
          <div className={containerClasses}>
            <div className={widgetClasses}>
              {widget.type === 'chatWidget' ? (
                <ChatWidget size={effectiveSize} />
              ) : (
                <NewsWidget />
              )}
            </div>
          </div>
        )
      }
      default:
        return <PlaceholderWidget size={effectiveSize} />
    }
  }

  const removeAllWidgets = async () => {
    if (!user?.id) return
    
    const newLayouts = {
      ...layoutState.layouts,
      desktop: [],
      mobile: []
    }
    
    setLayoutState(prev => ({
      ...prev,
      layouts: newLayouts
    }))
    
    await saveDashboardLayout(user.id, newLayouts)
  }

  return (
    <div className="p-4">
      <style>{customStyles}</style>
      <div className="mb-4 flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild id="widget-canvas">
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('widgets.addWidget')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover text-popover-foreground border-border max-h-[400px] overflow-y-auto">
            <DropdownMenuLabel>{t('widgets.categories.calendar')}</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('calendarWidget', 'large')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Calendar className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.calendarView')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel>{t('widgets.categories.charts')}</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('equityChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <LineChart className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.equityChart')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('pnlChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <BarChart className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.pnlChart')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('timeOfDayChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Clock className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.timeOfDay')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('timeInPositionChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Timer className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.timeInPosition')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('weekdayPnlChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Calendar className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.weekdayPnl')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('pnlBySideChart')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.pnlBySide')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('tickDistribution')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <BarChart className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.tickDistribution')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('commissionsPnl')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <PiggyBank className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.commissionsPnl')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel>{t('widgets.categories.statistics')}</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('averagePositionTime')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Clock className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.averagePositionTime')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('cumulativePnl')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <PiggyBank className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.cumulativePnl')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('longShortPerformance')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.longShortPerformance')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('tradePerformance')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <BarChart className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.tradePerformance')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('winningStreak')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Award className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.winningStreak')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => addWidget('statisticsWidget')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <BarChart2 className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.statisticsOverview')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel>{t('widgets.categories.tables')}</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('tradeTableReview', 'large')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Table2 className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.tradeReviewTable')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel>{t('widgets.categories.other')}</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('moodSelector', 'tiny')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Smile className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.moodSelector')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel>{t('widgets.categories.communication')}</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('chatWidget', 'medium')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.chat')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel>{t('widgets.categories.marketData')}</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => addWidget('newsWidget', 'large')}
              className="hover:bg-accent hover:text-accent-foreground"
            >
              <Info className="mr-2 h-4 w-4 shrink-0" />
              <span>{t('widgets.types.marketNews')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-4">
          {isCustomizing && (
            <AlertDialog open={isRemoveAllDialogOpen} onOpenChange={setIsRemoveAllDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Minus className="h-4 w-4" />
                  {t('widgets.removeAll')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('widgets.removeAllConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('widgets.removeAllDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('widgets.cancel')}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => {
                      removeAllWidgets()
                      setIsCustomizing(false)
                      setIsRemoveAllDialogOpen(false)
                    }}
                  >
                    {t('widgets.removeAllWidgets')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <div className="flex items-center space-x-2">
            <Switch
              id="customize-mode"
              checked={isCustomizing}
              onCheckedChange={(checked) => {
                setIsCustomizing(checked)
                if (!checked) {
                  setIsRemoveAllDialogOpen(false)
                }
              }}
            />
            <label htmlFor="customize-mode">{isCustomizing ? t('widgets.done') : t('widgets.edit')}</label>
          </div>
        </div>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={generateResponsiveLayout(layoutState.layouts[layoutState.activeLayout])}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        rowHeight={isMobile ? 65 : 70}
        isDraggable={isCustomizing}
        isResizable={false}
        draggableHandle=".drag-handle"
        onDragStart={() => setIsUserAction(true)}
        onLayoutChange={handleLayoutChange}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
        style={{ 
          minHeight: isMobile ? '100vh' : 'auto',
          touchAction: isCustomizing ? 'none' : 'auto'
        }}
      >
        {layoutState.layouts[layoutState.activeLayout].map((widget) => (
          <div key={widget.i} className="h-full">
            <WidgetWrapper
              onRemove={() => removeWidget(widget.i)}
              onChangeType={(type) => changeWidgetType(widget.i, type)}
              onChangeSize={(size) => changeWidgetSize(widget.i, size)}
              isCustomizing={isCustomizing}
              size={widget.size}
              currentType={widget.type}
              onCustomize={() => setIsCustomizing(true)}
            >
              {renderWidget(widget)}
            </WidgetWrapper>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}
