"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useData } from "@/context/data-provider"
import { Check, Pencil, Trash2, RotateCcw } from "lucide-react"
import { AddWidgetSheet } from "./add-widget-sheet"
import { DASHBOARD_COMPACT_BREAKPOINT, WidgetType, WidgetSize, Layouts, Widget } from "../types/dashboard"
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
import { useMediaQuery } from "@/hooks/use-media-query"

const PILL_CELL =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-none px-2.5 text-sm font-medium text-[#171717] hover:bg-transparent"
const PILL_ICON_CELL =
  "inline-flex size-8 items-center justify-center rounded-none text-[#171717] hover:bg-transparent"
const PILL_DELETE_CELL =
  "inline-flex size-8 items-center justify-center rounded-none text-[#DC2626] hover:bg-transparent hover:text-[#DC2626]"

function PillDivider() {
  return <span aria-hidden className="h-4 w-px shrink-0 bg-[#E5E5E5]" />
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
  onRemoveAll,
  onRestoreDefaults,
  mobileActiveWidget = null,
  onRemoveWidget,
}: ToolbarProps) {
  const t = useI18n()
  const { isMobile } = useData()
  const isCompactScreen = useMediaQuery(`(max-width: ${DASHBOARD_COMPACT_BREAKPOINT}px)`)
  const isNarrowScreen = useMediaQuery("(max-width: 767px)")
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

  const useCompactLayout = isMobile || isCompactScreen
  const iconOnly = isMobile || isNarrowScreen

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
  }, [isConsentVisible])

  const restoreButton = (
    <Button
      variant="ghost"
      className={PILL_ICON_CELL}
      aria-label={t('widgets.restoreDefaults')}
      title={t('widgets.restoreDefaults')}
    >
      <RotateCcw className="h-4 w-4" />
    </Button>
  )

  const deleteIconButton = (
    <Button
      variant="ghost"
      className={PILL_DELETE_CELL}
      aria-label={t('widgets.deleteAll')}
      title={t('widgets.deleteAll')}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed inset-x-4 z-10 mx-auto w-auto md:inset-x-0 md:w-fit md:max-w-[calc(100vw-1rem)]",
        isConsentVisible ? "bottom-36 sm:bottom-20" : "bottom-4"
      )}
    >
      <div className="relative flex max-w-full items-center rounded-full border border-[#E5E5E5] bg-white px-2 py-[6px]">
        {isCustomizing ? (
          <>
            <Button
              onClick={onEditToggle}
              aria-label={t('widgets.done')}
              className={cn(
                iconOnly
                  ? "size-8 rounded-full bg-[#171717] p-0 text-white hover:bg-[#171717]/90"
                  : "h-8 rounded-full bg-[#171717] px-3.5 text-sm font-medium text-white hover:bg-[#171717]/90"
              )}
            >
              {iconOnly ? <Check className="h-4 w-4" strokeWidth={2} /> : t('widgets.done')}
            </Button>
            <PillDivider />
            <AddWidgetSheet
              onAddWidget={onAddWidget}
              isCustomizing={isCustomizing}
              compact={iconOnly}
              appearance="pill"
            />
            <PillDivider />
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
            <PillDivider />
            {isMobile && onRemoveWidget ? (
              <MobileWidgetDeleteDialog
                activeWidget={mobileActiveWidget}
                onRemoveWidget={onRemoveWidget}
                onRemoveAll={onRemoveAll}
                compact={useCompactLayout}
                appearance="pill"
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
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={onEditToggle}
              aria-label={t('widgets.edit')}
              className={iconOnly ? PILL_ICON_CELL : PILL_CELL}
            >
              <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {!iconOnly ? t('widgets.edit') : null}
            </Button>
            <PillDivider />
            <AddWidgetSheet
              onAddWidget={onAddWidget}
              isCustomizing={isCustomizing}
              compact={iconOnly}
              appearance="pill"
            />
          </>
        )}
      </div>
    </div>
  )
}
