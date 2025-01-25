"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from 'lucide-react'
import { useI18n } from "@/locales/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from '@/lib/utils'
import { WidgetType, WidgetSize } from '../types/dashboard'
import { getWidgetsByCategory, WIDGET_REGISTRY, getWidgetPreview } from '../config/widget-registry'

interface AddWidgetSheetProps {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
}

interface PreviewCardProps {
  onClick: () => void
  children: React.ReactNode
  className?: string
}

function PreviewCard({ onClick, className, children }: PreviewCardProps) {
  const t = useI18n()
  return (
    <div 
      className={cn(
        "cursor-pointer rounded-md relative group m-1 w-full overflow-hidden px-2",
        className
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-50 rounded-md border">
        <p className="text-foreground font-medium">{t('widgets.clickToAdd')}</p>
      </div>
      {children}
    </div>
  )
}

export function AddWidgetSheet({ onAddWidget }: AddWidgetSheetProps) {
  const t = useI18n()
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
          variant="ghost"
          size="icon"
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">{t('widgets.addWidget')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[90vw] sm:max-w-[640px]">
        <SheetHeader>
          <SheetTitle>{t('widgets.addWidget')}</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="charts" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="charts" className="flex-1">{t('widgets.categories.charts')}</TabsTrigger>
            <TabsTrigger value="statistics" className="flex-1">{t('widgets.categories.statistics')}</TabsTrigger>
            <TabsTrigger value="tables" className="flex-1">{t('widgets.categories.tables')}</TabsTrigger>
            <TabsTrigger value="other" className="flex-1">{t('widgets.categories.other')}</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[calc(100vh-12rem)] mt-2 rounded-md pr-4">
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
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
} 