"use client"

import { useI18n } from "@/locales/client"
import type { FinancialEventDateWindow } from "@/lib/financial-events/date-window"
import {
  FINANCIAL_EVENT_LOAD_ATTEMPTS,
  financialEventLoadKey,
} from "@/lib/financial-events/ensure-load"
import { useFinancialEventsStore } from "@/store/widgets/financial-events-store"

/**
 * Shown after the automatic retries are exhausted. The store already kept the
 * error; nothing else on the calendar or journal read it, so the month stayed
 * failed with no way to try again.
 */
export function FinancialEventLoadRetry({
  window,
  lang,
}: {
  window: FinancialEventDateWindow | null
  lang: string
}) {
  const t = useI18n()
  const startMs = window?.start.getTime()
  const endMs = window?.end.getTime()
  const key =
    startMs == null || endMs == null || !lang
      ? null
      : financialEventLoadKey(lang, startMs, endMs)
  const attempts = useFinancialEventsStore((state) =>
    key ? (state.loadErrors[key]?.attempts ?? 0) : 0,
  )
  const retry = useFinancialEventsStore((state) => state.retryFinancialEventLoad)
  if (!key || attempts < FINANCIAL_EVENT_LOAD_ATTEMPTS) return null
  return (
    <button
      type="button"
      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      onClick={() => retry(key)}
    >
      {t("calendar.newsLoadRetry")}
    </button>
  )
}
