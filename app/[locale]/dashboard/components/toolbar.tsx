"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useData } from "@/context/data-provider"
import { Pencil, Trash2, RotateCcw } from "lucide-react"
import { AddWidgetSheet } from "./add-widget-sheet"
import { WidgetType, WidgetSize, Layouts, Widget } from "../types/dashboard"
import { MobileWidgetDeleteDialog } from "./mobile-widget-delete-dialog"
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
import { useState, useEffect, useRef, type ReactNode } from "react"
import { WIDGET_TOOLBAR_PILL_CELL } from "./widget-toolbar-classes"

const STRIP_CELL =
  "inline-flex size-8 items-center justify-center rounded-full text-[#171717] transition-colors hover:bg-black/5 hover:text-[#171717] dark:text-foreground dark:hover:bg-white/10 dark:hover:text-foreground"
const STRIP_DELETE_CELL =
  "inline-flex size-8 items-center justify-center rounded-full text-[#DC2626] transition-colors hover:bg-black/5 hover:text-[#DC2626] dark:hover:bg-white/10"

function PillDivider() {
  return <span aria-hidden className="h-4 w-px shrink-0 bg-[#E5E5E5] dark:bg-border" />
}

interface ToolbarProps {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
  onEditToggle: () => void
  currentLayout: Layouts
  onRemoveAll: () => void
  onRestoreDefaults: () => void
  mobileActiveWidget?: Widget | null
  onRemoveWidget?: (widgetId: string) => void
  minimapTrigger?: ReactNode
}

export function Toolbar({
  onAddWidget,
  isCustomizing,
  onEditToggle,
  currentLayout,
  onRemoveAll,
  onRestoreDefaults,
  mobileActiveWidget = null,
  onRemoveWidget,
  minimapTrigger,
}: ToolbarProps) {
  const t = useI18n()
  const { isMobile } = useData()
  const [isConsentVisible, setIsConsentVisible] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const hasConsentBanner = document.body.hasAttribute('data-consent-banner')
      setIsConsentVisible(hasConsentBanner)
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-consent-banner']
    })

    return () => observer.disconnect()
  }, [])

  const hasMinimapTrigger = Boolean(minimapTrigger)

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return

    const updateToolbarMetrics = () => {
      const rect = toolbar.getBoundingClientRect()
      document.documentElement.style.setProperty(
        "--mobile-toolbar-top",
        `${window.innerHeight - rect.top}px`
      )
    }

    updateToolbarMetrics()

    const resizeObserver = new ResizeObserver(updateToolbarMetrics)
    resizeObserver.observe(toolbar)
    window.addEventListener("resize", updateToolbarMetrics)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateToolbarMetrics)
    }
  }, [isConsentVisible, hasMinimapTrigger])

  const restoreButton = (
    <Button
      variant="ghost"
      className={STRIP_CELL}
      aria-label={t('widgets.restoreDefaults')}
      title={t('widgets.restoreDefaults')}
    >
      <RotateCcw className="h-4 w-4" />
    </Button>
  )

  const deleteIconButton = (
    <Button
      variant="ghost"
      className={STRIP_DELETE_CELL}
      aria-label={t('widgets.deleteAll')}
      title={t('widgets.deleteAll')}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )

  const addAndMinimap = (
    <>
      <AddWidgetSheet
        onAddWidget={onAddWidget}
        isCustomizing={isCustomizing}
        currentLayout={currentLayout}
        appearance="pill"
      />
      {minimapTrigger ? (
        <>
          <PillDivider />
          <div className="-my-1.5 flex shrink-0 items-center justify-center">
            {minimapTrigger}
          </div>
        </>
      ) : null}
    </>
  )

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed inset-x-0 z-10 mx-auto w-fit max-w-[calc(100vw-2rem)]",
        isConsentVisible ? "bottom-36 sm:bottom-20" : "bottom-4"
      )}
    >
      <div className="relative w-fit max-w-full">
        {isCustomizing ? (
          <div
            role="group"
            className="absolute bottom-full left-2 mb-2 flex items-center rounded-full bg-[#F5F5F5] p-0.5 dark:bg-muted"
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                {restoreButton}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('widgets.restoreDefaultsConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('widgets.restoreDefaultsConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={onRestoreDefaults}>
                    {t('widgets.confirmRestoreDefaults')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {isMobile && onRemoveWidget ? (
              <MobileWidgetDeleteDialog
                activeWidget={mobileActiveWidget}
                onRemoveWidget={onRemoveWidget}
                onRemoveAll={onRemoveAll}
                appearance="strip"
              />
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  {deleteIconButton}
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
        ) : null}

        <div className="flex max-w-full items-center rounded-full border border-[#E5E5E5] bg-white px-2 py-[6px] shadow-none dark:border-border dark:bg-background">
          {isCustomizing ? (
            <Button
              onClick={onEditToggle}
              aria-label={t('widgets.done')}
              className="h-8 rounded-full bg-[#171717] px-3.5 text-sm font-medium text-white shadow-none hover:bg-[#171717]/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90"
            >
              {t('widgets.done')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={onEditToggle}
              aria-label={t('widgets.edit')}
              className={WIDGET_TOOLBAR_PILL_CELL}
            >
              <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {t('widgets.edit')}
            </Button>
          )}
          <PillDivider />
          {addAndMinimap}
        </div>
      </div>
    </div>
  )
}
