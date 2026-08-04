"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/locales/client";
import { createTradeWithDefaults } from "@/lib/trade-factory";
import {
  IgImportError,
  parseIgTransactionHistory,
} from "@/lib/ig-transaction-import";
import { ProcessedTradesPreview } from "../components/processed-trades-preview";
import { PlatformProcessorProps } from "../config/platforms";

export default function IgProcessor({
  headers,
  csvData,
  processedTrades,
  setProcessedTrades,
}: PlatformProcessorProps) {
  const t = useI18n();
  const [skippedRows, setSkippedRows] = useState(0);
  const [errorCode, setErrorCode] = useState<
    "activity-history" | "missing-columns" | null
  >(null);

  useEffect(() => {
    try {
      const result = parseIgTransactionHistory(headers, csvData);
      setProcessedTrades(
        result.trades.map((trade) => createTradeWithDefaults(trade)),
      );
      setSkippedRows(result.skippedRows.length);
      setErrorCode(null);
    } catch (error) {
      setProcessedTrades([]);
      setSkippedRows(0);
      setErrorCode(
        error instanceof IgImportError ? error.code : "missing-columns",
      );
    }
  }, [csvData, headers, setProcessedTrades]);

  const errorMessage =
    errorCode === "activity-history"
      ? t("import.ig.error.activityHistory")
      : t("import.ig.error.invalidFile");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="space-y-4 p-6">
          {errorCode && (
            <div
              className="rounded-r border-l-4 border-red-500 bg-red-100 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              <p className="font-medium">{t("import.ig.error.title")}</p>
              <p>{errorMessage}</p>
            </div>
          )}

          {!errorCode && skippedRows > 0 && (
            <div
              className="rounded-r border-l-4 border-amber-500 bg-amber-100 p-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              role="status"
            >
              {t("import.ig.skippedRows", { count: skippedRows })}
            </div>
          )}

          {!errorCode && processedTrades.length === 0 && (
            <div
              className="rounded-r border-l-4 border-amber-500 bg-amber-100 p-4 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              role="alert"
            >
              <p className="font-medium">{t("import.ig.noTrades")}</p>
              <p>{t("import.ig.noTradesDescription")}</p>
            </div>
          )}

          {!errorCode && processedTrades.length > 0 && (
            <ProcessedTradesPreview trades={processedTrades} />
          )}
        </div>
      </div>
    </div>
  );
}
