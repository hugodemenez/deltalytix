"use client"

import { useEffect, useState } from "react"
import { useI18n } from "@/locales/client"
import { createTradeWithDefaults } from "@/lib/trade-factory"
import {
  DeepchartsImportError,
  parseDeepchartsTradeList,
} from "@/lib/deepcharts-import"
import { ProcessedTradesPreview } from "../components/processed-trades-preview"
import { PlatformProcessorProps } from "../config/platforms"

export default function DeepchartsProcessor({
  headers,
  csvData,
  processedTrades,
  setProcessedTrades,
}: PlatformProcessorProps) {
  const t = useI18n()
  const [errorCode, setErrorCode] = useState<"missing-columns" | null>(null)

  useEffect(() => {
    try {
      const result = parseDeepchartsTradeList(headers, csvData)
      setProcessedTrades(
        result.trades.map((trade) => createTradeWithDefaults(trade)),
      )
      setErrorCode(null)
    } catch (error) {
      setProcessedTrades([])
      setErrorCode(
        error instanceof DeepchartsImportError
          ? error.code
          : "missing-columns",
      )
    }
  }, [csvData, headers, setProcessedTrades])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-6">
          {errorCode && (
            <div
              className="rounded-r border-l-4 border-red-500 bg-red-100 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              <p className="font-medium">{t("import.deepcharts.error.title")}</p>
              <p>{t("import.deepcharts.error.invalidFile")}</p>
            </div>
          )}

          {!errorCode && processedTrades.length === 0 && (
            <div
              className="rounded-r border-l-4 border-amber-500 bg-amber-100 p-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              role="alert"
            >
              <p className="font-medium">{t("import.deepcharts.noTrades")}</p>
              <p>{t("import.deepcharts.noTradesDescription")}</p>
            </div>
          )}

          {!errorCode && processedTrades.length > 0 && (
            <ProcessedTradesPreview trades={processedTrades} />
          )}
        </div>
      </div>
    </div>
  )
}
