"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { journalMobileDateLine } from "@/lib/journal/journal-mobile-date"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import type { ReactNode } from "react"

interface JournalMobileHeaderProps {
  date: Date
  tradeCount: number
  pane: "journal" | "summary"
  isExporting: boolean
  onPaneChange: (pane: "journal" | "summary") => void
  onPreviousDay: () => void
  onNextDay: () => void
  onExportPdf: () => void
  onExportDocx: () => void
}

export function JournalMobileHeader({
  date,
  tradeCount,
  pane,
  isExporting,
  onPaneChange,
  onPreviousDay,
  onNextDay,
  onExportPdf,
  onExportDocx,
}: JournalMobileHeaderProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const dateLine = journalMobileDateLine(date, tradeCount, locale, {
    none: t("mindset.header.noTrades"),
    one: t("mindset.header.oneTrade"),
    many: (count) => t("mindset.header.tradeCount", { count }),
  })

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <h2 className="min-w-0 flex-1 text-base font-semibold">
          {t("mindset.shortTitle")}
        </h2>
        <IconButton
          label={t("mindset.previousDay")}
          onClick={onPreviousDay}
        >
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <IconButton label={t("mindset.nextDay")} onClick={onNextDay}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#a3a3a3]"
              aria-label={t("mindset.moreActions")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {t("mindset.description")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isExporting}
              onSelect={() => {
                void onExportPdf()
              }}
            >
              {t("mindset.exportAllPdf")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isExporting}
              onSelect={() => {
                void onExportDocx()
              }}
            >
              {t("mindset.exportAllDocx")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={pane}
              onValueChange={(next) => {
                if (next === "journal" || next === "summary") {
                  onPaneChange(next)
                }
              }}
            >
              <DropdownMenuRadioItem value="journal">
                {t("mindset.panes.journal")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="summary">
                {t("mindset.panes.summary")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="mt-0.5 text-xs text-[#8a8a8a]">{dateLine}</p>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-[#a3a3a3]"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
