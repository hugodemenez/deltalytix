"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useUserData } from "@/components/context/user-data"
import { Pencil, Camera, Trash2 } from "lucide-react"
import { ShareButton } from "./share-button"
import { AddWidgetSheet } from "./add-widget-sheet"
import FilterLeftPane from "./filters/filter-left-pane"
import { WidgetType, WidgetSize } from "../types/dashboard"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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

interface ToolbarProps {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
  isScreenshotMode: boolean
  onEditToggle: () => void
  onScreenshotToggle: () => void
  currentLayout: {
    desktop: any[]
    mobile: any[]
  }
  onRemoveAll: () => void
}

export function Toolbar({
  onAddWidget,
  isCustomizing,
  isScreenshotMode,
  onEditToggle,
  onScreenshotToggle,
  currentLayout,
  onRemoveAll
}: ToolbarProps) {
  const t = useI18n()
  const { isMobile } = useUserData()

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center">
      <div className="mx-auto flex items-center justify-around gap-4 p-3 bg-background/80 backdrop-blur-md border rounded-full shadow-lg overflow-visible">
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

        <Button
          variant={isScreenshotMode ? "default" : "ghost"}
          onClick={onScreenshotToggle}
          className={cn(
            "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
            isMobile ? "w-10 p-0" : "min-w-[120px] gap-3 px-4"
          )}
        >
          <Camera className={cn(
            "h-4 w-4 shrink-0",
            isScreenshotMode && "text-background"
          )} />
          {!isMobile && (
            <span className="text-sm font-medium">
              {isScreenshotMode ? t('widgets.doneScreenshot') : t('widgets.screenshot')}
            </span>
          )}
        </Button>

        <ShareButton currentLayout={currentLayout} />

        <AddWidgetSheet onAddWidget={onAddWidget} isCustomizing={isCustomizing} />

        {isMobile && (
          <FilterLeftPane />
        )}
      </div>
    </div>
  )
} 