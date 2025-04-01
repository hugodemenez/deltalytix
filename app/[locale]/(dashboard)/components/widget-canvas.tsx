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
import { Minus, Maximize2, Square, Plus, MoreVertical, GripVertical, Minimize2, Pencil, Camera, Trash2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useUserData } from '@/components/context/user-data'
import { useI18n } from "@/locales/client"
import { WIDGET_REGISTRY, getWidgetComponent } from '../config/widget-registry'
import { useAutoScroll } from '../hooks/use-auto-scroll'
import { cn } from '@/lib/utils'
import { Widget, WidgetType, WidgetSize } from '../types/dashboard'
import type { LayoutItem as ServerLayoutItem, Layouts } from '@/server/user-data'
import { Skeleton } from "@/components/ui/skeleton"
import { Toolbar } from './toolbar'

// Add type for our local LayoutItem that extends the server one
type LayoutItem = Omit<ServerLayoutItem, 'type' | 'size'> & {
  type: string
  size: string
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
const generateResponsiveLayout = (widgets: LayoutItem[]) => {
  const layouts = {
    lg: widgets.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize)
    })),
    md: widgets.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize)
    })),
    sm: widgets.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, true),
      x: 0 // Align to left
    })),
    xs: widgets.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, true),
      x: 0 // Align to left
    })),
    xxs: widgets.map(widget => ({
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

// Add ScreenshotOverlay component
function ScreenshotOverlay({ onScreenshot }: { onScreenshot: () => void }) {
  return (
    <div className="absolute inset-0 bg-background/50 dark:bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
      <Button
        variant="secondary"
        size="icon"
        onClick={(e) => {
          e.stopPropagation()
          onScreenshot()
        }}
        className="h-10 w-10 bg-background/90 hover:bg-background/100"
      >
        <Camera className="h-4 w-4" />
        <span className="sr-only">Take Screenshot</span>
      </Button>
    </div>
  )
}

function WidgetWrapper({ children, onRemove, onChangeType, onChangeSize, isCustomizing, isScreenshotMode, size, currentType, onCustomize, onScreenshotToggle }: { 
  children: React.ReactNode
  onRemove: () => void
  onChangeType: (type: WidgetType) => void
  onChangeSize: (size: WidgetSize) => void
  isCustomizing: boolean
  isScreenshotMode: boolean
  size: WidgetSize
  currentType: WidgetType
  onCustomize: () => void
  onScreenshotToggle: () => void
}) {
  const t = useI18n()
  const { isMobile } = useUserData()
  const widgetRef = useRef<HTMLDivElement>(null)
  const [isSizePopoverOpen, setIsSizePopoverOpen] = useState(false)

  const handleSizeChange = (newSize: WidgetSize) => {
    onChangeSize(newSize)
    setIsSizePopoverOpen(false)
  }

  const handleScreenshot = async () => {
    if (!widgetRef.current) return
    
    try {
      // Get background color for consistent rendering
      const bgColor = getComputedStyle(document.body).backgroundColor
      const fontFamily = getComputedStyle(document.body).fontFamily
    
      // Regular HTML content with SVG handling
      const canvas = await html2canvas(widgetRef.current, {
        backgroundColor: bgColor,
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true,
        onclone: async (clonedDoc, element) => {
          // Get the actual computed font family from the document root
          const rootStyles = window.getComputedStyle(document.documentElement)
          const computedFontFamily = rootStyles.getPropertyValue('--font-sans').trim() || 'Inter'
          const fontFamily = computedFontFamily

          // Function to deeply apply text styles
          const applyTextStyles = (el: Element) => {
            if (el instanceof HTMLElement) {
              const style = window.getComputedStyle(el)
              const rect = el.getBoundingClientRect()
              
              // Copy all text-related styles
              const textStyles = {
                // Font styles
                'font-family': style.fontFamily || fontFamily,
                'font-size': style.fontSize,
                'font-weight': style.fontWeight,
                'font-style': style.fontStyle,
                'letter-spacing': style.letterSpacing,
                'line-height': style.lineHeight,
                'text-align': style.textAlign,
                'text-transform': style.textTransform,
                'text-decoration': style.textDecoration,
                'white-space': style.whiteSpace,
                'word-break': style.wordBreak,
                'word-wrap': style.wordWrap,
                'text-overflow': style.textOverflow,
                
                // Colors and backgrounds
                'color': style.color,
                'background-color': style.backgroundColor,
                'opacity': style.opacity,
                
                // Box model
                'padding': style.padding,
                'margin': style.margin,
                'border': style.border,
                'border-radius': style.borderRadius,
                
                // Positioning and dimensions
                'display': style.display,
                'position': style.position === 'static' ? 'relative' : style.position,
                'left': style.left,
                'top': style.top,
                'right': style.right,
                'bottom': style.bottom,
                'width': `${rect.width}px`,
                'height': `${rect.height}px`,
                'min-width': style.minWidth,
                'min-height': style.minHeight,
                'max-width': style.maxWidth,
                'max-height': style.maxHeight,
                
                // Flexbox properties
                'align-items': style.alignItems,
                'justify-content': style.justifyContent,
                'flex': style.flex,
                'flex-direction': style.flexDirection,
                'flex-wrap': style.flexWrap,
                'gap': style.gap,
                
                // Grid properties
                'grid-template-columns': style.gridTemplateColumns,
                'grid-template-rows': style.gridTemplateRows,
                'grid-gap': style.gridGap,
                
                // Transforms and transitions
                'transform': style.transform,
                'transform-origin': style.transformOrigin,
                'transition': 'none',
                
                // Overflow and visibility
                'overflow': 'visible',
                'visibility': style.visibility,
                'z-index': style.zIndex,
                
                // Text rendering
                '-webkit-font-smoothing': 'antialiased',
                'text-rendering': 'optimizeLegibility',
                'font-smooth': 'always'
              }

              // Apply all styles at once
              Object.entries(textStyles).forEach(([property, value]) => {
                if (value && value !== 'none' && value !== '0px') {
                  el.style.setProperty(property, value, 'important')
                }
              })
            }

            // Recursively apply to all child elements
            el.childNodes.forEach(child => {
              if (child instanceof Element) {
                applyTextStyles(child)
              }
            })
          }

          // Apply styles to the entire element tree
          applyTextStyles(element)

          // Handle SVG elements
          element.querySelectorAll('svg').forEach(svg => {
            // Get computed styles and actual dimensions
            const svgStyle = window.getComputedStyle(svg)
            const rect = svg.getBoundingClientRect()
            
            // Get the computed dimensions including any transformations
            const computedWidth = rect.width
            const computedHeight = rect.height
            
            // Get the original viewBox if it exists
            const originalViewBox = svg.getAttribute('viewBox')
            const viewBoxValues = originalViewBox ? originalViewBox.split(' ').map(Number) : null
            
            // Calculate the aspect ratio
            const aspectRatio = viewBoxValues 
              ? viewBoxValues[2] / viewBoxValues[3]
              : computedWidth / computedHeight
            
            // Set explicit dimensions while preserving aspect ratio
            svg.style.width = `${computedWidth}px`
            svg.style.height = `${computedHeight}px`
            svg.setAttribute('width', `${computedWidth}`)
            svg.setAttribute('height', `${computedHeight}`)
            
            // If there was no original viewBox, create one based on computed dimensions
            if (!viewBoxValues) {
              svg.setAttribute('viewBox', `0 0 ${computedWidth} ${computedHeight}`)
            }
            
            // Preserve the aspect ratio
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
            
            // Ensure the SVG container preserves dimensions
            svg.style.display = 'block'
            svg.style.position = svgStyle.position === 'static' ? 'relative' : svgStyle.position
            svg.style.minWidth = `${computedWidth}px`
            svg.style.minHeight = `${computedHeight}px`
            svg.style.overflow = 'visible'

            // Copy all relevant SVG styles
            const relevantStyles = [
              'transform',
              'transform-origin',
              'fill',
              'stroke',
              'stroke-width',
              'opacity',
              'filter',
              'vector-effect'
            ]
            
            relevantStyles.forEach(style => {
              const value = svgStyle.getPropertyValue(style)
              if (value) svg.style.setProperty(style, value)
            })

            // Process all text elements in the SVG
            svg.querySelectorAll('text').forEach(textEl => {
              const textStyle = window.getComputedStyle(textEl)
              const bbox = textEl.getBBox()
              
              // Special handling for Recharts axis labels
              const isAxisLabel = textEl.closest('.recharts-cartesian-axis-tick-value')
              if (isAxisLabel) {
                // Preserve original position attributes
                const x = textEl.getAttribute('x')
                const y = textEl.getAttribute('y')
                const textAnchor = textEl.getAttribute('text-anchor')
                const orientation = textEl.getAttribute('orientation')
                const fontSize = textEl.getAttribute('font-size')
                
                // Apply font styles while preserving positioning
                textEl.style.setProperty('font-family', fontFamily, 'important')
                textEl.style.fontSize = fontSize || '11px'
                textEl.style.fill = 'currentColor'
                
                // Apply font family to all tspans within this axis label
                textEl.querySelectorAll('tspan').forEach(tspan => {
                  tspan.style.setProperty('font-family', fontFamily, 'important')
                  tspan.style.fontSize = fontSize || '11px'
                })
                
                // Restore original positioning
                if (x) textEl.setAttribute('x', x)
                if (y) textEl.setAttribute('y', y)
                if (textAnchor) textEl.setAttribute('text-anchor', textAnchor)
                if (orientation) textEl.setAttribute('orientation', orientation)
                
                // Ensure proper text rendering
                textEl.style.setProperty('-webkit-font-smoothing', 'antialiased')
                textEl.style.setProperty('text-rendering', 'optimizeLegibility')
              } else {
                // Regular text element handling
                const parentStyle = window.getComputedStyle(textEl.parentElement || document.body)
                
                textEl.style.fontFamily = textStyle.fontFamily || parentStyle.fontFamily || fontFamily
                textEl.style.fontSize = textStyle.fontSize || parentStyle.fontSize
                textEl.style.fontWeight = textStyle.fontWeight || parentStyle.fontWeight
                textEl.style.fill = textStyle.fill || textStyle.color || parentStyle.color || 'currentColor'
                
                // Ensure proper text positioning
                textEl.setAttribute('x', bbox.x.toString())
                textEl.setAttribute('y', (bbox.y + bbox.height).toString())
                textEl.setAttribute('text-anchor', textStyle.textAnchor || 'start')
                textEl.setAttribute('dominant-baseline', textStyle.dominantBaseline || 'auto')
                
                // Add text rendering improvements
                textEl.style.setProperty('-webkit-font-smoothing', 'antialiased')
                textEl.style.setProperty('text-rendering', 'optimizeLegibility')
              }
            })

            // Update tspan handling
            svg.querySelectorAll('tspan').forEach(tspan => {
              const parentText = tspan.closest('text')
              if (!parentText) return
              
              const isAxisLabel = parentText.closest('.recharts-cartesian-axis-tick-value')
              if (isAxisLabel) {
                tspan.style.setProperty('font-family', fontFamily, 'important')
                tspan.style.fill = 'currentColor'
              } else {
                const parentStyle = window.getComputedStyle(parentText)
                tspan.style.setProperty('font-family', parentStyle.fontFamily || fontFamily, 'important')
                tspan.style.fontSize = parentStyle.fontSize
                tspan.style.fontWeight = parentStyle.fontWeight
                tspan.style.fill = parentStyle.fill || 'currentColor'
              }
            })
          })
          
          // Handle text elements (h1, h2, h3, p, span, etc.)
          element.querySelectorAll('h1, h2, h3, p, span').forEach((textEl: Element) => {
            if (textEl instanceof HTMLElement) {
              // Get computed styles and actual dimensions
              const textStyle = window.getComputedStyle(textEl)
              const rect = textEl.getBoundingClientRect()
              
              // Get the computed dimensions including any transformations
              const computedWidth = rect.width
              const computedHeight = rect.height
              
              // Set explicit dimensions
              textEl.style.width = `${computedWidth}px`
              textEl.style.height = `${computedHeight}px`
              textEl.style.minWidth = `${computedWidth}px`
              textEl.style.minHeight = `${computedHeight}px`
              
              // Copy all text-related styles
              const textStyles = {
                'font-family': textStyle.fontFamily || fontFamily,
                'font-size': textStyle.fontSize,
                'font-weight': textStyle.fontWeight,
                'letter-spacing': textStyle.letterSpacing,
                'line-height': textStyle.lineHeight,
                'text-align': textStyle.textAlign,
                'text-transform': textStyle.textTransform,
                'text-decoration': textStyle.textDecoration,
                'white-space': textStyle.whiteSpace,
                'word-break': textStyle.wordBreak,
                'word-wrap': textStyle.wordWrap,
                'text-overflow': textStyle.textOverflow,
                'color': textStyle.color,
                'fill': textStyle.fill || 'currentColor',
                'opacity': textStyle.opacity
              }
              
              // Apply all text styles
              Object.entries(textStyles).forEach(([property, value]) => {
                if (value) textEl.style.setProperty(property, value)
              })
              
              // Ensure proper text rendering
              textEl.style.setProperty('-webkit-font-smoothing', 'antialiased')
              textEl.style.setProperty('text-rendering', 'optimizeLegibility')
            }
          })
        }
      })
    
      // Create final screenshot
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `widget-${currentType}-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        // Exit screenshot mode after taking the screenshot
        onScreenshotToggle()
      }, 'image/png')
    } catch (error) {
      console.error('Error taking screenshot:', error)
    }
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
      className="relative h-full w-full overflow-hidden rounded-lg bg-background shadow-[0_2px_4px_rgba(0,0,0,0.05)] group isolate"
      onTouchStart={handleTouchStart}
    >
      <div className={cn("h-full w-full transition-all duration-200", 
        (isCustomizing || isScreenshotMode) && "group-hover:blur-[2px]"
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
      {isScreenshotMode && (
        <ScreenshotOverlay onScreenshot={handleScreenshot} />
      )}
    </div>
  )
}

// Add a function to pre-calculate widget dimensions
function getWidgetDimensions(widget: LayoutItem, isMobile: boolean) {
  const grid = getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, isMobile)
  return {
    w: grid.w,
    h: grid.h,
    width: `${(grid.w * 100) / 12}%`,
    height: `${grid.h * (isMobile ? 65 : 70)}px`
  }
}

export default function WidgetCanvas() {
  const { user, isMobile, layouts, setLayouts, saveLayouts } = useUserData()
  
  // Group all useState hooks together at the top
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [isScreenshotMode, setIsScreenshotMode] = useState(false)
  const [isUserAction, setIsUserAction] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Add this state to track if the layout change is from user interaction
  const activeLayout = useMemo(() => isMobile ? 'mobile' : 'desktop', [isMobile])
  
  // Move all memoized values up, out of conditional rendering paths
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), [])

  // Group all useMemo hooks together
  const widgetDimensions = useMemo(() => {
    if (!layouts) return {}
    const dimensions: Record<string, ReturnType<typeof getWidgetDimensions>> = {}
    
    // Calculate dimensions once and store them
    layouts[activeLayout].forEach(widget => {
      dimensions[widget.i] = getWidgetDimensions(widget as LayoutItem, isMobile)
    })
    
    return dimensions
  }, [layouts, activeLayout, isMobile])

  const responsiveLayout = useMemo(() => {
    if (!layouts) return {}
    return generateResponsiveLayout(layouts[activeLayout] as unknown as LayoutItem[])
  }, [layouts, activeLayout])

  const currentLayout = useMemo(() => {
    if (!layouts) return []
    return layouts[activeLayout] as LayoutItem[]
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
      setLayouts(updatedLayouts);
      
      // Only save to database if it's a user action (drag/drop)
      if (isUserAction) {
        saveLayouts(updatedLayouts);
        setIsUserAction(false);
      }
    } catch (error) {
      console.error('Error updating layout:', error);
      // Revert to previous layout on error
      setLayouts(layouts);
    }
  }, [user?.id, isCustomizing, setLayouts, layouts, activeLayout, isMobile, isUserAction, saveLayouts, setIsUserAction]);

  // Define addWidget with all dependencies
  const addWidget = useCallback(async (type: WidgetType, size: WidgetSize = 'medium') => {
    if (!user?.id || !layouts) return
    
    // Determine default size based on widget type
    let effectiveSize = size
    // Calendar widget is always large, trade table is always extra large
    if (type === 'calendarWidget') {
      effectiveSize = 'large'
    } else if (type === 'tradeTableReview') {
      effectiveSize = 'extra-large'
    }
    // Statistics widgets are always tiny
    else if (['averagePositionTime', 'cumulativePnl', 
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
    
    const currentLayout = layouts[activeLayout]
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
              [activeLayout]: updatedWidgets
            }
            
            setLayouts(newLayouts)
            await saveLayouts(newLayouts)
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
      [activeLayout]: updatedWidgets
    }
    
    setLayouts(newLayouts)
    await saveLayouts(newLayouts)
  }, [user?.id, layouts, activeLayout, setLayouts, saveLayouts]);

  // Define removeWidget with all dependencies
  const removeWidget = useCallback(async (i: string) => {
    if (!user?.id || !layouts) return
    const updatedWidgets = layouts[activeLayout].filter(widget => widget.i !== i)
    const newLayouts = {
      ...layouts,
      [activeLayout]: updatedWidgets
    }
    setLayouts(newLayouts)
    await saveLayouts(newLayouts)
  }, [user?.id, layouts, activeLayout, setLayouts, saveLayouts]);

  // Define changeWidgetType with all dependencies
  const changeWidgetType = useCallback(async (i: string, newType: WidgetType) => {
    if (!user?.id || !layouts) return
    const updatedWidgets = layouts[activeLayout].map(widget => 
      widget.i === i ? { ...widget, type: newType } : widget
    )
    const newLayouts = {
      ...layouts,
      [activeLayout]: updatedWidgets
    }
    setLayouts(newLayouts)
    await saveLayouts(newLayouts)
  }, [user?.id, layouts, activeLayout, setLayouts, saveLayouts]);

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
      [activeLayout]: updatedWidgets
    }
    setLayouts(newLayouts)
    await saveLayouts(newLayouts)
  }, [user?.id, layouts, activeLayout, setLayouts, saveLayouts]);

  // Define removeAllWidgets with all dependencies
  const removeAllWidgets = useCallback(async () => {
    if (!user?.id || !layouts) return
    
    const newLayouts = {
      ...layouts,
      desktop: [],
      mobile: []
    }
    
    setLayouts(newLayouts)
    await saveLayouts(newLayouts)
  }, [user?.id, layouts, setLayouts, saveLayouts]);

  // Define renderWidget with all dependencies
  const renderWidget = useCallback((widget: LayoutItem) => {
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

  // Group all useEffect hooks together
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, []);

  useEffect(() => {
    if (layouts && mounted) {
      const opacityTimer = setTimeout(() => {
        setIsLoading(false)
      }, 300)

      return () => {
        clearTimeout(opacityTimer)
      }
    }
  }, [layouts, mounted]);

  useEffect(() => {
    if (isCustomizing) {
      document.addEventListener('click', handleOutsideClick)
      return () => document.removeEventListener('click', handleOutsideClick)
    }
  }, [isCustomizing, handleOutsideClick]);

  // Add auto-scroll functionality for mobile
  useAutoScroll(isMobile && isCustomizing)

  // Don't render anything until mounted and layouts are loaded
  if (!mounted || !layouts) {
    return <Skeleton className="h-full w-full" />
  }

  return (
    <div className={cn(
      "relative mt-6 pb-16",
    )}>
      <Toolbar 
        onAddWidget={addWidget}
        isCustomizing={isCustomizing}
        isScreenshotMode={isScreenshotMode}
        onEditToggle={() => {
          setIsCustomizing(!isCustomizing)
          if (isScreenshotMode) setIsScreenshotMode(false)
        }}
        onScreenshotToggle={() => {
          setIsScreenshotMode(!isScreenshotMode)
          if (isCustomizing) setIsCustomizing(false)
        }}
        currentLayout={layouts || { desktop: [], mobile: [] }}
        onRemoveAll={removeAllWidgets}
      />

      {layouts && (
        <div className="relative">
          <div id="tooltip-portal" className="fixed inset-0 pointer-events-none z-[9999]" />
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
              const typedWidget = widget as unknown as LayoutItem
              const dimensions = widgetDimensions[typedWidget.i]
              
              return (
                <div 
                  key={typedWidget.i} 
                  className="h-full" 
                  data-customizing={isCustomizing}
                  style={{
                    width: dimensions.width,
                    height: dimensions.height
                  }}
                >
                  <WidgetWrapper
                    onRemove={() => removeWidget(typedWidget.i)}
                    onChangeType={(type) => changeWidgetType(typedWidget.i, type)}
                    onChangeSize={(size) => changeWidgetSize(typedWidget.i, size)}
                    isCustomizing={isCustomizing}
                    isScreenshotMode={isScreenshotMode}
                    size={typedWidget.size as WidgetSize}
                    currentType={typedWidget.type as WidgetType}
                    onCustomize={() => setIsCustomizing(true)}
                    onScreenshotToggle={() => setIsScreenshotMode(false)}
                  >
                    {renderWidget(typedWidget)}
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
