'use client'

import { useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { WIDGET_REGISTRY, getWidgetComponent } from '@/app/[locale]/dashboard/config/widget-registry'
import { Widget, WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { useData } from '@/context/data-provider'
import { defaultLayouts } from '@/lib/default-layouts'


// Update sizeToGrid to handle responsive sizes (copy from widget-canvas.tsx)
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
      x: 0 // Align to left
    })),
    xs: widgets.map(widget => ({
      ...widget,
      ...sizeToGrid(widget.size, true),
      x: 0 // Align to left
    })),
    xxs: widgets.map(widget => ({
      ...widget,
      ...sizeToGrid(widget.size, true),
      x: 0 // Align to left
    }))
  }
  return layouts
}

export function SharedWidgetCanvas() {
  const { isMobile } = useData()
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), [])
  
  // Use default layouts instead of the passed layout prop
  const activeLayout = isMobile ? 'mobile' : 'desktop'

  const renderWidget = (widget: Widget) => {
    // Ensure widget.type is a valid WidgetType
    if (!Object.keys(WIDGET_REGISTRY).includes(widget.type)) {
      return null // Skip invalid widgets in shared view
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
      return widget.size
    })()

    return getWidgetComponent(widget.type, effectiveSize)
  }

  // Transform server layout items to include required grid properties
  const transformedLayout = useMemo(() => {
    const layoutItems = (activeLayout === 'desktop' ? defaultLayouts.desktop : defaultLayouts.mobile) as unknown as Widget[]
    return layoutItems.map((item: Widget, index: number) => ({
      ...item,
      i: item.i || `widget-${index}`,
      // Preserve original x,y positions from default layouts
      x: item.x,
      y: item.y,
      w: sizeToGrid(item.size, isMobile).w,
      h: sizeToGrid(item.size, isMobile).h
    }))
  }, [activeLayout, isMobile])

  return (
    <div className="relative mt-6">
      <div id="tooltip-portal" className="fixed inset-0 pointer-events-none z-9999" />
      <ResponsiveGridLayout
        className="layout"
        layouts={generateResponsiveLayout(transformedLayout)}
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
          minHeight: isMobile ? '100vh' : 'auto',
          touchAction: 'auto'
        }}
      >
        {transformedLayout.map((widget: Widget) => (
          <div key={widget.i} className="h-full">
            <div className="relative h-full w-full overflow-hidden rounded-lg bg-background shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-md">
              {renderWidget(widget)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
} 