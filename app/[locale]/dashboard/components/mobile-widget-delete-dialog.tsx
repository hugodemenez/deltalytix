"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { getWidgetDisplayName } from "../lib/widget-display-name"
import { Widget } from "../types/dashboard"

interface MobileWidgetDeleteDialogProps {
  activeWidget: Widget | null
  onRemoveWidget: (widgetId: string) => void
  onRemoveAll: () => void | Promise<void>
  compact?: boolean
}

export function MobileWidgetDeleteDialog({
  activeWidget,
  onRemoveWidget,
  onRemoveAll,
  compact = false,
}: MobileWidgetDeleteDialogProps) {
  const t = useI18n()
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const widgetName = activeWidget
    ? getWidgetDisplayName(t, activeWidget.type)
    : ""

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            className={cn(
              "h-10 rounded-full flex items-center justify-center transition-transform active:scale-95",
              compact ? "w-10 shrink-0 p-0" : "min-w-[120px] gap-3 px-4"
            )}
            aria-label={t("widgets.mobile.deleteDialogTitle")}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            {!compact && (
              <span className="text-sm font-medium">{t("widgets.removeWidget")}</span>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("widgets.mobile.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("widgets.mobile.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!activeWidget}
              onClick={() => activeWidget && onRemoveWidget(activeWidget.i)}
            >
              {activeWidget
                ? t("widgets.mobile.deleteWidgetNamed", { widgetName })
                : t("widgets.removeWidget")}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">{t("widgets.cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteAllOpen(true)}
            >
              {t("widgets.deleteAll")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("widgets.deleteAllConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("widgets.deleteAllConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onRemoveAll()}
            >
              {t("widgets.confirmDeleteAll")}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">{t("widgets.cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
