"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useI18n } from "@/locales/client"
import { FileText, FileType } from "lucide-react"

interface JournalExportMenuItemsProps {
  isExporting: boolean
  onExportPdf: () => void
  onExportDocx: () => void
}

export function JournalExportMenuItems({
  isExporting,
  onExportPdf,
  onExportDocx,
}: JournalExportMenuItemsProps) {
  const t = useI18n()

  return (
    <>
      <DropdownMenuItem
        disabled={isExporting}
        className="items-start gap-3 py-2.5"
        onSelect={() => {
          void onExportPdf()
        }}
      >
        <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="whitespace-nowrap font-medium">
            {t("mindset.exportAllPdf")}
          </span>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={isExporting}
        className="items-start gap-3 py-2.5"
        onSelect={() => {
          void onExportDocx()
        }}
      >
        <FileType className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="whitespace-nowrap font-medium">
            {t("mindset.exportAllDocx")}
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">
            {t("mindset.exportAllDocxDescription")}
          </span>
        </div>
      </DropdownMenuItem>
    </>
  )
}
