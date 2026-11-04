"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  journalMobileNewsRows,
  newsImportanceDotClass,
} from "@/lib/journal/journal-mobile-news-rows"
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { FinancialEvent } from "@/prisma/generated/prisma/browser"
import { useUserStore } from "@/store/user-store"
import { formatInTimeZone } from "date-fns-tz"
import { useMemo, useState } from "react"

interface JournalMobileNewsProps {
  events: FinancialEvent[]
  selectedNews: string[]
}

export function JournalMobileNews({
  events,
  selectedNews,
}: JournalMobileNewsProps) {
  const t = useI18n()
  const timezone = useUserStore((state) => state.timezone)
  const [showOnlySelectedNews, setShowOnlySelectedNews] = useState(true)
  const checkboxId = "journal-mobile-show-only-selected"

  const rows = useMemo(() => {
    const visible = showOnlySelectedNews
      ? events.filter((event) => selectedNews.includes(event.id))
      : events

    return journalMobileNewsRows(
      visible.map((event) => ({
        id: event.id,
        time: formatInTimeZone(new Date(event.date), timezone, "HH:mm"),
        title: event.title,
        importance: event.importance,
      })),
    )
  }, [events, selectedNews, showOnlySelectedNews, timezone])

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <p className="flex-none text-sm text-muted-foreground">
        {t("mindset.newsImpact.title")}
      </p>
      <div
        data-journal-news-scroll
        className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-[10px] border border-border"
      >
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex min-h-10 items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
          >
            <span className="w-[3.25rem] shrink-0 tabular-nums text-sm text-muted-foreground">
              {row.time}
            </span>
            {row.event ? (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    newsImportanceDotClass(row.event.importance),
                  )}
                />
                <span className="min-w-0 truncate text-sm font-medium">
                  {row.event.title}
                </span>
              </>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-none items-start gap-2">
        <Checkbox
          id={checkboxId}
          className="mt-0.5"
          checked={showOnlySelectedNews}
          onCheckedChange={(checked) => setShowOnlySelectedNews(checked === true)}
        />
        <Label
          htmlFor={checkboxId}
          className="text-xs font-normal leading-snug text-muted-foreground"
        >
          {t("mindset.newsImpact.showOnlySelectedNews")}
        </Label>
      </div>
    </div>
  )
}
