"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Minus, Maximize2, GripVertical } from 'lucide-react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useData } from '@/context/data-provider'
import { useI18n } from "@/locales/client"
import { WIDGET_REGISTRY, getWidgetComponent } from '../config/widget-registry'
import { useAutoScroll } from '../../../../hooks/use-auto-scroll'
import { cn } from '@/lib/utils'
import { Widget, WidgetType, WidgetSize, LayoutItem } from '../types/dashboard'
import { Toolbar } from './toolbar'
import { useUserStore, DashboardLayoutWithWidgets } from '../../../../store/user-store'
import { toast } from "sonner"
import { defaultLayouts } from "@/lib/default-layouts"
import { Prisma, DashboardLayout } from "@/prisma/generated/prisma/browser"

// Helper function to convert internal layout to Prisma type
const toPrismaLayout = (layout: DashboardLayoutWithWidgets): DashboardLayout => {
  return {
    ...layout,
    desktop: layout.desktop as unknown as Prisma.JsonValue,
    mobile: layout.mobile as unknown as Prisma.JsonValue,
  }
}

// Update sizeToGrid to handle responsive sizes
const sizeToGrid = (size: WidgetSize, isSmallScreen = false): { w: number, h: number } => {
  if (isSmallScreen) {
    switch (size) {
      case 'tiny':
        return { w: 12, h: 1 }
      case 'small':
        return { w: 12, h: 2 }
      case 'small-long':
        return { w: 12, h: 2 }
      case 'medium':
        return { w: 12, h: 4 }
      case 'large':
      case 'extra-large':
        return { w: 12, h: 6 }
      default:
        return { w: 12, h: 4 }
    }
  }

  // Desktop sizes
  switch (size) {
    case 'tiny':
      return { w: 3, h: 1 }
    case 'small':
      return { w: 3, h: 4 }
    case 'small-long':
      return { w: 6, h: 2 }
    case 'medium':
      return { w: 6, h: 4 }
    case 'large':
      return { w: 6, h: 8 }
    case 'extra-large':
      return { w: 12, h: 8 }
    default:
      return { w: 6, h: 4 }
  }
}

// Add a function to get grid dimensions based on widget type and size
const getWidgetGrid = (type: WidgetType, size: WidgetSize, isSmallScreen = false): { w: number, h: number } => {
  const config = WIDGET_REGISTRY[type]
  if (!config) {
    // Return a default medium size grid for deprecated widgets
    return isSmallScreen ? { w: 12, h: 4 } : { w: 6, h: 4 }
  }
  if (isSmallScreen) {
    return sizeToGrid(size, true)
  }
  return sizeToGrid(size)
}

// Create layouts for different breakpoints
const generateResponsiveLayout = (widgets: Widget[]) => {
  const widgetArray = Array.isArray(widgets) ? widgets : []
  
  const layouts = {
    lg: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize)
    })),
    md: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize),
    })),
    sm: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, true),
      x: 0 // Align to left
    })),
    xs: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, true),
      x: 0 // Align to left
    })),
    xxs: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, true),
      x: 0 // Align to left
    }))
  }
  return layouts
}

function DeprecatedWidget({ onRemove }: { onRemove: () => void }) {
  const t = useI18n()
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('widgets.deprecated.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        <p className="text-muted-foreground text-center">
          {t('widgets.deprecated.description')}
        </p>
        <Button variant="destructive" onClick={onRemove}>
          {t('widgets.deprecated.remove')}
        </Button>
      </CardContent>
    </Card>
  )
}

function WidgetWrapper({ children, onRemove, onChangeSize, isCustomizing, size, currentType }: { 
  children: React.ReactNode
  onRemove: () => void
  onChangeSize: (size: WidgetSize) => void
  isCustomizing: boolean
  size: WidgetSize
  currentType: WidgetType
}) {
  const t = useI18n()
  const { isMobile } = useData()
  const widgetRef = useRef<HTMLDivElement>(null)
  const [isSizePopoverOpen, setIsSizePopoverOpen] = useState(false)

  const handleSizeChange = (newSize: WidgetSize) => {
    onChangeSize(newSize)
    setIsSizePopoverOpen(false)
  }

  // Add touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isCustomizing) {
      // Prevent default touch behavior when customizing
      e.preventDefault()
    }
  }

  const isValidSize = (widgetType: WidgetType, size: WidgetSize) => {
    const config = WIDGET_REGISTRY[widgetType]
    if (!config) return true // Allow any size for deprecated widgets
    if (isMobile) {
      // On mobile, only allow tiny (shown as Small), medium (shown as Medium), and large (shown as Large)
      if (size === 'small' || size === 'small-long') return false
      return config.allowedSizes.includes(size)
    }
    return config.allowedSizes.includes(size)
  }

  return (
    <div 
      ref={widgetRef}
      className="relative h-full w-full rounded-lg bg-background shadow-[0_2px_4px_rgba(0,0,0,0.05)] group isolate animate-[fadeIn_1.5s_ease-in-out] overflow-clip"
      onTouchStart={handleTouchStart}
    >
      <div className={cn("h-full w-full", 
        isCustomizing && "group-hover:blur-[2px]",
        isCustomizing && isMobile && "blur-[2px]"
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
            <Popover open={isSizePopoverOpen} onOpenChange={setIsSizePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <div className="flex flex-col gap-1">
                  {isMobile ? (
                    <>
                      <Button
                        variant={size === 'tiny' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('tiny')}
                        disabled={!isValidSize(currentType, 'tiny') || size === 'tiny'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-4 rounded",
                            size === 'tiny' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>{t('widgets.size.mobile.small')}</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'medium' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('medium')}
                        disabled={!isValidSize(currentType, 'medium') || size === 'medium'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-8 rounded",
                            size === 'medium' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>{t('widgets.size.mobile.medium')}</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'large' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('large')}
                        disabled={!isValidSize(currentType, 'large') || size === 'large'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-12 rounded",
                            size === 'large' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>{t('widgets.size.mobile.large')}</span>
                        </div>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant={size === 'tiny' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('tiny')}
                        disabled={!isValidSize(currentType, 'tiny') || size === 'tiny'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-4 rounded",
                            size === 'tiny' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>{t('widgets.size.tiny')}</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'small' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('small')}
                        disabled={!isValidSize(currentType, 'small') || size === 'small'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-6 rounded",
                            size === 'small' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>{t('widgets.size.small')}</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'medium' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('medium')}
                        disabled={!isValidSize(currentType, 'medium') || size === 'medium'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-8 rounded",
                            size === 'medium' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>{t('widgets.size.medium')}</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'large' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('large')}
                        disabled={!isValidSize(currentType, 'large') || size === 'large'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-10 rounded",
                            size === 'large' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>{t('widgets.size.large')}</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'extra-large' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('extra-large')}
                        disabled={!isValidSize(currentType, 'extra-large') || size === 'extra-large'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-12 rounded",
                            size === 'extra-large' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>{t('widgets.size.extra-large')}</span>
                        </div>
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
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
  )
}

// Add a function to pre-calculate widget dimensions
function getWidgetDimensions(widget: Widget, isMobile: boolean) {
  const grid = getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, isMobile)
  return {
    w: grid.w,
    h: grid.h,
    width: `${(grid.w * 100) / 12}%`,
    height: `${grid.h * (isMobile ? 65 : 70)}px`
  }
}

type WidgetDimensions = { w: number; h: number; width: string; height: string }

export default function WidgetCanvas() {
  const { isMobile, dashboardLayout:layouts, setDashboardLayout:setLayouts } = useUserStore(state => state)
  const  user = useUserStore(state => state.user)
  const { saveDashboardLayout } = useData()
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [isUserAction, setIsUserAction] = useState(false)
  const t = useI18n()

  // Add this state to track if the layout change is from user interaction
  const activeLayout = useMemo(() => isMobile ? 'mobile' : 'desktop', [isMobile])
  
  // Move all memoized values up, out of conditional rendering paths
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), [])

  // Group all useMemo hooks together
  const widgetDimensions = useMemo(() => {
    if (!layouts?.[activeLayout]) return {}
    
    const widgets = layouts[activeLayout]
    return widgets.reduce((acc: Record<string, WidgetDimensions>, widget) => {
      acc[widget.i] = getWidgetDimensions(widget, isMobile)
      return acc
    }, {} as Record<string, WidgetDimensions>)
  }, [layouts, activeLayout, isMobile])

  const responsiveLayout = useMemo(() => {
    if (!layouts) return {}
    return generateResponsiveLayout(layouts[activeLayout])
  }, [layouts, activeLayout])

  const currentLayout = useMemo(() => {
    if (!layouts?.[activeLayout]) return []
    // Filter out duplicate widgets by type, keep only the first occurrence
    const seenTypes = new Set()
    return layouts[activeLayout].filter(widget => {
      if (seenTypes.has(widget.type)) return false
      seenTypes.add(widget.type)
      return true
    })
  }, [layouts, activeLayout])

  // Define handleOutsideClick before using it in useEffect
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
  }, [setIsCustomizing])

  // Update handleLayoutChange with proper type handling and all dependencies
  const handleLayoutChange = useCallback((layout: LayoutItem[], allLayouts: any) => {
    if (!user?.id || !isCustomizing || !setLayouts || !layouts) return;

    try {
      // Keep the existing layouts for the non-active layout
      const updatedLayouts = {
        ...layouts,
        [activeLayout]: layout.map(item => {
          // Find the existing widget to preserve its type and size
          const existingWidget = layouts[activeLayout].find(w => w.i === item.i);
          if (!existingWidget) return null;

          // Create updated widget with proper type assertions
          const updatedWidget = {
            ...existingWidget,
            x: isMobile ? 0 : item.x,
            y: item.y,
            w: isMobile ? 12 : item.w,
            h: item.h,
          };

          return updatedWidget;
        }).filter((item): item is NonNullable<typeof item> => item !== null)
      };

      // Update the state first
      setLayouts({
        ...layouts,
        desktop: updatedLayouts.desktop,
        mobile: updatedLayouts.mobile,
        updatedAt: new Date()
      });
      
      // Always save to database when layout changes
      saveDashboardLayout(toPrismaLayout(updatedLayouts));
      
      // Reset user action flag
      if (isUserAction) {
        setIsUserAction(false);
      }
    } catch (error) {
      console.error('Error updating layout:', error);
      // Revert to previous layout on error
      setLayouts(layouts);
    }
  }, [user?.id, isCustomizing, setLayouts, layouts, activeLayout, isMobile, isUserAction, saveDashboardLayout, setIsUserAction]);

  // Define addWidget with all dependencies
  const addWidget = useCallback(async (type: WidgetType, size: WidgetSize = 'medium') => {
    if (!user?.id) {
      console.error('Error adding widget missing user data:', { user})
      return
    }
    if (!layouts) {
      console.error('Error adding widget missing layouts:', { layouts })
      return
    }
    
    const currentLayout = layouts[activeLayout]

    // Prevent adding duplicate widget types
    if (currentLayout.some(widget => widget.type === type)) {
      toast.error(t('widgets.duplicate.title'), {
        description: t('widgets.duplicate.description'),
      })
      return
    }

    // Determine default size based on widget type
    const effectiveSize = size

    const grid = sizeToGrid(effectiveSize, activeLayout === 'mobile')
    
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
              ...layouts,
              [activeLayout]: updatedWidgets,
              updatedAt: new Date()
            }
            
            setLayouts(newLayouts)
            toast.success(t('widgets.widgetAdded'), {
              description: t('widgets.widgetAddedDescription'),
            })
            await saveDashboardLayout(toPrismaLayout(newLayouts))
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
      ...layouts,
      [activeLayout]: updatedWidgets,
      updatedAt: new Date()
    }
    
    setLayouts(newLayouts)
    
    toast.success(t('widgets.widgetAdded'), {
      description: t('widgets.widgetAddedDescription'),
    })
    await saveDashboardLayout(toPrismaLayout(newLayouts))

  }, [user?.id, layouts, activeLayout, setLayouts, saveDashboardLayout, t, toast]);

  // Define removeWidget with all dependencies
  const removeWidget = useCallback(async (i: string) => {
    if (!user?.id || !layouts) return
    const updatedWidgets = layouts[activeLayout].filter(widget => widget.i !== i)
    const newLayouts = {
      ...layouts,
      [activeLayout]: updatedWidgets,
      updatedAt: new Date()
    }
    setLayouts(newLayouts)
    await saveDashboardLayout(toPrismaLayout(newLayouts))
  }, [user?.id, layouts, activeLayout, setLayouts, saveDashboardLayout]);

  // Define changeWidgetType with all dependencies
  const changeWidgetType = useCallback(async (i: string, newType: WidgetType) => {
    if (!user?.id || !layouts) return
    const updatedWidgets = layouts[activeLayout].map(widget => 
      widget.i === i ? { ...widget, type: newType } : widget
    )
    const newLayouts = {
      ...layouts,
      [activeLayout]: updatedWidgets,
      updatedAt: new Date()
    }
    setLayouts(newLayouts)
    await saveDashboardLayout(toPrismaLayout(newLayouts))
  }, [user?.id, layouts, activeLayout, setLayouts, saveDashboardLayout]);

  // Define changeWidgetSize with all dependencies
  const changeWidgetSize = useCallback(async (i: string, newSize: WidgetSize) => {
    if (!user?.id || !layouts) return
    
    // Find the widget
    const widget = layouts[activeLayout].find(w => w.i === i)
    if (!widget) return
    
    // Prevent charts from being set to tiny size
    let effectiveSize = newSize
    if (widget.type.includes('Chart') && newSize === 'tiny') {
      effectiveSize = 'medium'
    }
    
    const grid = sizeToGrid(effectiveSize)
    const updatedWidgets = layouts[activeLayout].map(widget => 
      widget.i === i ? { ...widget, size: effectiveSize, ...grid } : widget
    )
    const newLayouts = {
      ...layouts,
      [activeLayout]: updatedWidgets,
      updatedAt: new Date()
    }
    setLayouts(newLayouts)
    await saveDashboardLayout(toPrismaLayout(newLayouts))
  }, [user?.id, layouts, activeLayout, setLayouts, saveDashboardLayout]);

  // Define removeAllWidgets with all dependencies
  const removeAllWidgets = useCallback(async () => {
    if (!user?.id || !layouts) return
    
    const newLayouts = {
      ...layouts,
      desktop: [],
      mobile: [],
      updatedAt: new Date()
    }
    
    setLayouts(newLayouts)
    await saveDashboardLayout(toPrismaLayout(newLayouts))
  }, [user?.id, layouts, setLayouts, saveDashboardLayout]);

  // Restore default layout for both desktop and mobile
  const restoreDefaultLayout = useCallback(async () => {
    if (!user?.id || !layouts) return
    const newLayouts = {
      ...layouts,
      desktop: defaultLayouts.desktop as unknown as Widget[],
      mobile: defaultLayouts.mobile as unknown as Widget[],
      updatedAt: new Date()
    }
    setLayouts(newLayouts)
    await saveDashboardLayout(toPrismaLayout(newLayouts))
    toast.success(t('widgets.restoredDefaultsTitle'), {
      description: t('widgets.restoredDefaultsDescription')
    })
  }, [user?.id, layouts, setLayouts, saveDashboardLayout, t, toast])

  // Define renderWidget with all dependencies
  const renderWidget = useCallback((widget: Widget) => {
    // Ensure widget.type is a valid WidgetType
    if (!Object.keys(WIDGET_REGISTRY).includes(widget.type)) {
      return (
          <DeprecatedWidget onRemove={() => removeWidget(widget.i)} />
      )
    }

    const config = WIDGET_REGISTRY[widget.type as keyof typeof WIDGET_REGISTRY]

    // For charts, ensure size is at least small-long
    const effectiveSize = (() => {
      if (config.requiresFullWidth) {
        return config.defaultSize
      }
      if (config.allowedSizes.length === 1) {
        return config.allowedSizes[0]
      }
      if (isMobile && widget.size !== 'tiny') {
        return 'small' as WidgetSize
      }
      return widget.size as WidgetSize
    })()

    return getWidgetComponent(widget.type as WidgetType, effectiveSize)
  }, [isMobile, removeWidget]);

  useEffect(() => {
    if (isCustomizing) {
      document.addEventListener('click', handleOutsideClick)
      return () => document.removeEventListener('click', handleOutsideClick)
    }
  }, [isCustomizing, handleOutsideClick]);

  // Add auto-scroll functionality for mobile
  useAutoScroll(isMobile && isCustomizing)

  return (
    <div className={cn(
      "relative mt-6 pb-16 w-full min-h-screen",
    )}>
      <Toolbar 
        onAddWidget={addWidget}
        isCustomizing={isCustomizing}
        onEditToggle={() => {
          setIsCustomizing(!isCustomizing)
        }}
        currentLayout={layouts || { desktop: [], mobile: [] }}
        onRemoveAll={removeAllWidgets}
        onRestoreDefaults={restoreDefaultLayout}
      />
      {layouts && (
        <div className="relative">
          <div id="tooltip-portal" className="fixed inset-0 pointer-events-none z-9999" />
          <ResponsiveGridLayout
            layouts={responsiveLayout}
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
            useCSSTransforms={true}
          >
            {currentLayout.map((widget) => {
              const dimensions = widgetDimensions[widget.i]
              
              return (
                <div 
                  key={widget.i} 
                  className="h-full" 
                  data-customizing={isCustomizing}
                  style={{
                    width: dimensions.width,
                    height: dimensions.height
                  }}
                >
                  <WidgetWrapper
                    onRemove={() => removeWidget(widget.i)}
                    onChangeSize={(size) => changeWidgetSize(widget.i, size)}
                    isCustomizing={isCustomizing}
                    size={widget.size}
                    currentType={widget.type}
                  >
                    {renderWidget(widget)}
                  </WidgetWrapper>
                </div>
              )
            })}
          </ResponsiveGridLayout>
        </div>
      )}
    </div>
  )
}
