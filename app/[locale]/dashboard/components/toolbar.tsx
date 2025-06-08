"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useData } from "@/context/data-provider"
import { Pencil, Trash2 } from "lucide-react"
import { ShareButton } from "./share-button"
import { AddWidgetSheet } from "./add-widget-sheet"
import FilterLeftPane from "./filters/filter-left-pane"
import { WidgetType, WidgetSize } from "../types/dashboard"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState, useEffect } from "react"
import { FilterDropdown } from "./filters/filter-dropdown"


interface ToolbarProps {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
  onEditToggle: () => void
  currentLayout: {
    desktop: any[]
    mobile: any[]
  }
  onRemoveAll: () => void
}

export function Toolbar({
  onAddWidget,
  isCustomizing,
  onEditToggle,
  currentLayout,
  onRemoveAll
}: ToolbarProps) {
  const t = useI18n()
  const { isMobile } = useData()
  
  // Check if consent banner is visible
  const [isConsentVisible, setIsConsentVisible] = useState(false)
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const hasConsentBanner = document.body.hasAttribute('data-consent-banner')
      setIsConsentVisible(hasConsentBanner)
    })
    
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['data-consent-banner'] 
    })
    
    // Initial check
    setIsConsentVisible(document.body.hasAttribute('data-consent-banner'))
    
    return () => observer.disconnect()
  }, [])
  
  return (
    <div className={cn(
      "fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
      isConsentVisible ? "bottom-36 sm:bottom-20" : "bottom-4"
    )}>
      <div className="flex items-center justify-around gap-4 p-3 bg-background/80 backdrop-blur-md border rounded-full shadow-lg">
        <Button
          variant={isCustomizing ? "default" : "ghost"}
          onClick={onEditToggle}
          className={cn(
            "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
            isMobile ? "w-10 p-0" : "min-w-[120px] gap-3 px-4"
          )}
        >
          <Pencil className={cn(
            "h-4 w-4 shrink-0",
            isCustomizing && "text-background"
          )} />
          {!isMobile && (
            <span className="text-sm font-medium">
              {isCustomizing ? t('widgets.done') : t('widgets.edit')}
            </span>
          )}
        </Button>

        <ShareButton currentLayout={currentLayout} />

        <AddWidgetSheet onAddWidget={onAddWidget} isCustomizing={isCustomizing} />

        {isMobile ? (
          <FilterLeftPane />
        ) : (
          <FilterDropdown />
        )}
        {isCustomizing && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className={cn(
                  "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
                )}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('widgets.deleteAllConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('widgets.deleteAllConfirmDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onRemoveAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('widgets.confirmDeleteAll')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
} 