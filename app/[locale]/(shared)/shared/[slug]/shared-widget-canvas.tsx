'use client'

import { useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { useUserData } from '@/components/context/user-data'
import { WIDGET_REGISTRY, getWidgetComponent } from '@/app/[locale]/(dashboard)/config/widget-registry'
import { WidgetType, WidgetSize } from '@/app/[locale]/(dashboard)/types/dashboard'
import type { LayoutItem as ServerLayoutItem } from '@/server/user-data'

// Add type for our local LayoutItem that extends the server one
type LayoutItem = Omit<ServerLayoutItem, 'type' | 'size'> & {
  type: string
  size: string
}

interface SharedWidgetCanvasProps {
  layout: {
    desktop: ServerLayoutItem[]
    mobile: ServerLayoutItem[]
  }
}

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
const generateResponsiveLayout = (widgets: LayoutItem[]) => {
  const layouts = {
    lg: widgets.map(widget => ({
      ...widget,
      ...sizeToGrid(widget.size as WidgetSize)
    })),
    md: widgets.map(widget => ({
      ...widget,
      ...sizeToGrid(widget.size as WidgetSize)
    })),
    sm: widgets.map(widget => ({
      ...widget,
      ...sizeToGrid(widget.size as WidgetSize, true),
      x: 0 // Align to left
    })),
    xs: widgets.map(widget => ({
      ...widget,
      ...sizeToGrid(widget.size as WidgetSize, true),
      x: 0 // Align to left
    })),
    xxs: widgets.map(widget => ({
      ...widget,
      ...sizeToGrid(widget.size as WidgetSize, true),
      x: 0 // Align to left
    }))
  }
  return layouts
}

export function SharedWidgetCanvas({ layout }: SharedWidgetCanvasProps) {
  const { isMobile } = useUserData()
  const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), [])
  const activeLayout = isMobile ? 'mobile' : 'desktop'

  const renderWidget = (widget: LayoutItem) => {
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
      return widget.size as WidgetSize
    })()

    return getWidgetComponent(widget.type as WidgetType, effectiveSize)
  }

  return (
    <div className="relative mt-6">
      <ResponsiveGridLayout
        className="layout"
        layouts={generateResponsiveLayout(layout[activeLayout] as unknown as LayoutItem[])}
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
        {layout[activeLayout].map((widget) => {
          // Cast the widget to our local LayoutItem type
          const typedWidget = widget as unknown as LayoutItem
          return (
            <div key={typedWidget.i} className="h-full">
              <div className="relative h-full w-full overflow-hidden rounded-lg bg-background shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-md">
                {renderWidget(typedWidget)}
              </div>
            </div>
          )
        })}
      </ResponsiveGridLayout>

      <style jsx global>{`
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
          }
          
          /* Allow scrolling on content that needs it */
          .react-grid-item [data-scrollable="true"] {
            touch-action: pan-y;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  )
} 