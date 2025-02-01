"use client"

import React, { forwardRef, useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from 'lucide-react'
import { useI18n } from "@/locales/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from '@/lib/utils'
import { WidgetType, WidgetSize } from '../types/dashboard'
import { getWidgetsByCategory, WIDGET_REGISTRY, getWidgetPreview } from '../config/widget-registry'
import { useUserData } from '@/components/context/user-data'

interface AddWidgetSheetProps {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
}

interface PreviewCardProps {
  onClick: () => void
  children: React.ReactNode
  className?: string
}

const PreviewCard = forwardRef<HTMLDivElement, PreviewCardProps>(
  ({ onClick, className, children }, ref) => {
    const t = useI18n()
    const { isMobile } = useUserData()
    return (
      <div 
        ref={ref}
        className={cn(
          "cursor-pointer rounded-md relative group m-1 w-full overflow-hidden px-2",
          className
        )}
        onClick={onClick}
      >
        {!isMobile && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-50 rounded-md border">
            <p className="text-foreground font-medium">{t('widgets.clickToAdd')}</p>
          </div>
        )}
        {children}
      </div>
    )
  }
)
PreviewCard.displayName = "PreviewCard"

export const AddWidgetSheet = forwardRef<HTMLButtonElement, AddWidgetSheetProps>(
  ({ onAddWidget, isCustomizing }, ref) => {
    const t = useI18n()
    const { isMobile } = useUserData()
    const [isOpen, setIsOpen] = React.useState(false)

    const handleAddWidget = (type: WidgetType) => {
      const config = WIDGET_REGISTRY[type]
      onAddWidget(type, config.defaultSize)
      setIsOpen(false)
    }

    const renderWidgetsByCategory = (category: 'charts' | 'statistics' | 'tables' | 'other') => {
      const widgets = getWidgetsByCategory(category)
      return (
        <div className="grid gap-4">
          {widgets.map((config) => (
            <PreviewCard
              key={config.type}
              onClick={() => handleAddWidget(config.type)}
              className={cn(
                `h-[${config.previewHeight}px]`,
              )}
            >
              {getWidgetPreview(config.type)}
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
            className={cn(
              "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
              isMobile ? "w-10 p-0" : "min-w-[120px] gap-3 px-4"
            )}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!isMobile && (
              <span className="text-sm font-medium">
                {t('widgets.addWidget')}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[90vw] sm:max-w-[640px] flex flex-col h-[100dvh] overflow-hidden">
          <SheetHeader>
            <SheetTitle>{t('widgets.addWidget')}</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="charts" className="flex-1 flex flex-col mt-6 min-h-0">
            <TabsList className="w-full">
              <TabsTrigger value="charts" className="flex-1">{t('widgets.categories.charts')}</TabsTrigger>
              <TabsTrigger value="statistics" className="flex-1">{t('widgets.categories.statistics')}</TabsTrigger>
              <TabsTrigger value="tables" className="flex-1">{t('widgets.categories.tables')}</TabsTrigger>
              <TabsTrigger value="other" className="flex-1">{t('widgets.categories.other')}</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1 mt-2">
              <div className="pr-4 pb-8">
                <TabsContent value="charts" className="mt-0">
                  {renderWidgetsByCategory('charts')}
                </TabsContent>
                <TabsContent value="statistics" className="mt-0">
                  {renderWidgetsByCategory('statistics')}
                </TabsContent>
                <TabsContent value="tables" className="mt-0">
                  {renderWidgetsByCategory('tables')}
                </TabsContent>
                <TabsContent value="other" className="mt-0">
                  {renderWidgetsByCategory('other')}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>
    )
  }
)

AddWidgetSheet.displayName = "AddWidgetSheet" 