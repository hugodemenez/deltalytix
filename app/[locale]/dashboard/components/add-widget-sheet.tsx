"use client"

import React, { forwardRef, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Loader2 } from 'lucide-react'
import { useI18n } from "@/locales/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from '@/lib/utils'
import { WidgetType, WidgetSize, Layouts } from '../types/dashboard'
import { getWidgetsByCategory, WIDGET_REGISTRY, getWidgetPreview } from '../config/widget-registry'
import { useData } from '@/context/data-provider'
import { useIsMobileLayout } from '@/hooks/use-mobile'
import {
  ADD_WIDGET_CATEGORIES,
  omitPlacedWidgets,
  placedTypesForViewport,
  type AddWidgetCategory,
} from './add-widget-catalog'
import {
  WIDGET_TOOLBAR_PILL_CELL,
  WIDGET_TOOLBAR_PILL_ICON_CELL,
} from './widget-toolbar-classes'

const CATEGORY_LABEL_KEY = {
  other: 'widgets.categories.other',
  charts: 'widgets.categories.charts',
  tables: 'widgets.categories.tables',
  statistics: 'widgets.categories.statistics',
} as const satisfies Record<AddWidgetCategory, `widgets.categories.${AddWidgetCategory}`>

interface AddWidgetSheetProps {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
  currentLayout: Layouts
  compact?: boolean
  appearance?: 'default' | 'pill'
}

interface PreviewCardProps {
  onClick: () => void
  children: React.ReactNode
  className?: string
}

interface LazyWidgetPreviewProps {
  config: any
  index: number
  isLoaded: boolean
  onAdd: () => void
  onVisible: () => void
  onWidgetLoaded: (index: number) => void
}

const LazyWidgetPreview: React.FC<LazyWidgetPreviewProps> = ({
  config,
  index,
  isLoaded,
  onAdd,
  onVisible,
  onWidgetLoaded
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
          onVisible()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [isVisible, onVisible])

  useEffect(() => {
    if (isVisible && isLoaded && !hasLoaded) {
      // Simulate progressive loading with a small delay
      const timer = setTimeout(() => {
        setHasLoaded(true)
        onWidgetLoaded(index)
      }, index * 100) // Stagger loading by 100ms per widget

      return () => clearTimeout(timer)
    }
  }, [isVisible, isLoaded, hasLoaded, index, onWidgetLoaded])

  return (
    <div ref={elementRef} className="w-full h-full">
      {!isVisible ? (
        <div className="w-full h-full bg-muted/30 rounded-md flex items-center justify-center">
          <div className="w-8 h-8 bg-muted rounded animate-pulse" />
        </div>
      ) : !hasLoaded ? (
        <div className="w-full h-full bg-muted/30 rounded-md flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        getWidgetPreview(config.type)
      )}
    </div>
  )
}

const PreviewCard = forwardRef<HTMLDivElement, PreviewCardProps>(
  ({ onClick, className, children }, ref) => {
    const t = useI18n()
    const { isMobile } = useData()
    return (
      <div 
        ref={ref}
        className={cn(
          "cursor-pointer rounded-md relative group m-1 w-full overflow-hidden px-2",
          "active:scale-[0.98] transition-all duration-150 ease-in-out",
          className
        )}
        onClick={onClick}
      >
        {!isMobile && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-xs">
            {t('widgets.clickToAdd')}
          </div>
        )}
        {children}
      </div>
    )
  }
)
PreviewCard.displayName = "PreviewCard"

export const AddWidgetSheet = forwardRef<HTMLButtonElement, AddWidgetSheetProps>(
  ({ onAddWidget, currentLayout, compact = false, appearance = 'default' }, ref) => {
    const t = useI18n()
    const isMobileLayout = useIsMobileLayout()
    const [isOpen, setIsOpen] = React.useState(false)
    const [loadedItems, setLoadedItems] = useState<Set<number>>(new Set())
    const [loadingStarted, setLoadingStarted] = useState(false)
    const placedTypes = useMemo(
      () => placedTypesForViewport(currentLayout, isMobileLayout === true),
      [currentLayout, isMobileLayout]
    )
    const visibleCategories = useMemo(
      () =>
        ADD_WIDGET_CATEGORIES.filter(
          (category) =>
            omitPlacedWidgets(getWidgetsByCategory(category), placedTypes)
              .length > 0
        ),
      [placedTypes]
    )
    const defaultCategory = visibleCategories[0] ?? 'other'

    const handleAddWidget = (type: WidgetType) => {
      const config = WIDGET_REGISTRY[type]
      onAddWidget(type, config.defaultSize)
    }

    const startLoading = useCallback(() => {
      if (!loadingStarted) {
        setLoadingStarted(true)
        // Progressive loading - load first few items immediately
        const initialItems = new Set([0, 1, 2])
        setLoadedItems(initialItems)
      }
    }, [loadingStarted])

    const onWidgetLoaded = useCallback((index: number) => {
      setLoadedItems(prev => {
        const newSet = new Set(prev)
        newSet.add(index)
        
        // Load next batch when current batch is loaded
        if (newSet.size > 0 && newSet.size % 3 === 0) {
          const nextBatch = Array.from({ length: 3 }, (_, i) => newSet.size + i)
          nextBatch.forEach(i => newSet.add(i))
        }
        
        return newSet
      })
    }, [])

    // Reset loading state when sheet opens/closes
    useEffect(() => {
      if (!isOpen) {
        setLoadedItems(new Set())
        setLoadingStarted(false)
      }
    }, [isOpen])

    const renderWidgetsByCategory = (category: AddWidgetCategory) => {
      const widgets = omitPlacedWidgets(
        getWidgetsByCategory(category),
        placedTypes
      )
      return (
        <div className="grid gap-4">
          {widgets.map((config, index) => (
            <PreviewCard
              key={config.type}
              onClick={() => handleAddWidget(config.type)}
              className={cn(
                `h-[${config.previewHeight}px]`,
              )}
            >
              {
                category === 'charts' ? (
                  <LazyWidgetPreview
                    key={config.type}
                    config={config}
                    index={index}
                    isLoaded={loadedItems.has(index)}
                    onAdd={() => handleAddWidget(config.type)}
                    onVisible={() => {
                      if (loadedItems.size === 0) {
                        startLoading()
                      }
                    }}
                    onWidgetLoaded={onWidgetLoaded}
                  />
                ) : (
                  getWidgetPreview(config.type)
                )
              }
            </PreviewCard>
          ))}
        </div>
      )
    }

    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            aria-label={t('widgets.addWidget')}
            className={cn(
              appearance === 'pill'
                ? compact
                  ? WIDGET_TOOLBAR_PILL_ICON_CELL
                  : WIDGET_TOOLBAR_PILL_CELL
                : 'flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-95',
              appearance !== 'pill' && (compact ? 'h-10 w-10 p-0' : 'h-10 gap-2 px-3')
            )}
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!compact ? (
              <span className="text-sm font-medium">
                {t('widgets.addWidget')}
              </span>
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[90vw] sm:max-w-[640px] flex flex-col h-dvh overflow-hidden">
          <SheetHeader>
            <SheetTitle>{t('widgets.addWidget')}</SheetTitle>
          </SheetHeader>
          {visibleCategories.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              {t('widgets.addSheet.empty')}
            </p>
          ) : (
            <Tabs
              key={visibleCategories.join('|')}
              defaultValue={defaultCategory}
              className="flex-1 flex flex-col mt-6 min-h-0"
            >
              <TabsList className="w-full">
                {visibleCategories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="flex-1"
                  >
                    {t(CATEGORY_LABEL_KEY[category])}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollArea className="flex-1 mt-2">
                <div className="pr-4 pb-8">
                  {visibleCategories.map((category) => (
                    <TabsContent key={category} value={category} className="mt-0">
                      {renderWidgetsByCategory(category)}
                    </TabsContent>
                  ))}
                </div>
              </ScrollArea>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    )
  }
)

AddWidgetSheet.displayName = "AddWidgetSheet" 