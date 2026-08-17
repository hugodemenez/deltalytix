"use client";

import { Trade } from "@/prisma/generated/prisma/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { parsePositionTime } from "@/lib/utils";
import { useI18n } from "@/locales/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AI_UNAVAILABLE_ERROR,
  parseFormatTradesApiError,
} from "@/lib/ai/openai-availability";
import {
  PARSE_PLAN_CHUNK_SIZE,
  PARSE_PREVIEW_LIMIT,
  createParsePlanSession,
  executeParsePlanChunk,
  isParsePlanComplete,
  missingRequiredFields,
  resolveParsePlan,
  type ExecutedTrade,
  type ParsePlan,
} from "@/lib/import/parse-plan";
import { planFromAiResponse } from "@/lib/import/plan-from-ai";

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

interface FormatPreviewProps {
  trades: string[][];
  processedTrades: Partial<Trade>[];
  setProcessedTrades: (trades: Partial<Trade>[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
  headers: string[];
  mappings: { [key: string]: string };
}

export function FormatPreview({
  trades: initialTrades,
  processedTrades: _processedTrades,
  setProcessedTrades,
  setIsLoading,
  headers,
  mappings,
}: FormatPreviewProps) {
  const t = useI18n();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseKind, setParseKind] = useState<"closed-trades" | "orders" | null>(
    null,
  );
  const [previewTrades, setPreviewTrades] = useState<Partial<Trade>[]>([]);
  const [formattedCount, setFormattedCount] = useState(0);
  const [rowsProcessed, setRowsProcessed] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [totals, setTotals] = useState({
    totalPnl: 0,
    totalCommission: 0,
    netPnl: 0,
  });
  const askedAiRef = useRef(false);

  const totalRows = initialTrades.length;

  useEffect(() => {
    let cancelled = false;

    const runChunks = async (plan: ParsePlan) => {
      setParseKind(plan.kind);
      setError(null);
      setIsParsing(true);
      setIsLoading(true);
      setPreviewTrades([]);
      setFormattedCount(0);
      setRowsProcessed(0);
      setTotals({ totalPnl: 0, totalCommission: 0, netPnl: 0 });
      setProcessedTrades([]);

      const session = createParsePlanSession();
      const all: ExecutedTrade[] = [];
      let totalPnl = 0;
      let totalCommission = 0;

      for (let offset = 0; offset < initialTrades.length; offset += PARSE_PLAN_CHUNK_SIZE) {
        if (cancelled) return;
        const { trades } = executeParsePlanChunk(
          initialTrades.slice(offset, offset + PARSE_PLAN_CHUNK_SIZE),
          plan,
          session,
        );
        for (const trade of trades) {
          all.push(trade);
          totalPnl += trade.pnl || 0;
          totalCommission += trade.commission || 0;
        }
        const processed = Math.min(offset + PARSE_PLAN_CHUNK_SIZE, initialTrades.length);
        setRowsProcessed(processed);
        setFormattedCount(all.length);
        setPreviewTrades(all.slice(0, PARSE_PREVIEW_LIMIT));
        setTotals({
          totalPnl,
          totalCommission,
          netPnl: totalPnl - totalCommission,
        });
        await yieldToMain();
      }

      if (cancelled) return;
      setProcessedTrades(all);
      setIsParsing(false);
      setIsLoading(false);
      if (all.length === 0) {
        setError(t("import.processing.noTradesFormatted"));
      }
    };

    const start = async () => {
      const plan = resolveParsePlan(headers, mappings);
      if (isParsePlanComplete(plan)) {
        await runChunks(plan);
        return;
      }

      if (askedAiRef.current) return;
      askedAiRef.current = true;
      setIsLoading(true);
      setError(null);
      const missing = missingRequiredFields(plan);

      try {
        const response = await fetch("/api/ai/import-parse-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headers,
            rows: initialTrades.slice(0, 8),
          }),
        });
        const raw = await response.text();
        if (cancelled) return;
        if (!response.ok) {
          const code = parseFormatTradesApiError(raw).code;
          setError(
            code === AI_UNAVAILABLE_ERROR
              ? t("import.processing.aiUnavailable")
              : t("import.processing.noTradesFormatted"),
          );
          setProcessedTrades([]);
          setIsLoading(false);
          return;
        }
        const aiPlan = planFromAiResponse(headers, JSON.parse(raw));
        if (!isParsePlanComplete(aiPlan)) {
          setError(
            t("import.parse.missingColumns", {
              columns: missing.join(", "),
            }),
          );
          setProcessedTrades([]);
          setIsLoading(false);
          return;
        }
        await runChunks(aiPlan);
      } catch {
        if (cancelled) return;
        setError(t("import.processing.noTradesFormatted"));
        setProcessedTrades([]);
        setIsLoading(false);
      }
    };

    void start();
    return () => {
      cancelled = true;
    };
  }, [headers, mappings, initialTrades, setProcessedTrades, setIsLoading, t]);

  const columns = useMemo<ColumnDef<Partial<Trade>>[]>(
    () => [
      {
        accessorKey: "entryDate",
        header: () => (
          <div className="font-medium">{t("trade-table.entryDate")}</div>
        ),
        cell: ({ row }) => {
          const entryDate = row.original.entryDate
            ? new Date(row.original.entryDate)
            : null;
          return entryDate && isValid(entryDate)
            ? format(entryDate, "yyyy-MM-dd HH:mm")
            : "—";
        },
        size: 180,
      },
      {
        accessorKey: "instrument",
        header: () => (
          <div className="font-medium">{t("trade-table.instrument")}</div>
        ),
        cell: ({ row }) => row.original.instrument,
        size: 120,
      },
      {
        accessorKey: "side",
        header: () => (
          <div className="font-medium">{t("trade-table.direction")}</div>
        ),
        cell: ({ row }) => (
          <span className="capitalize">{row.original.side}</span>
        ),
        size: 100,
      },
      {
        accessorKey: "quantity",
        header: () => (
          <div className="font-medium">{t("trade-table.quantity")}</div>
        ),
        cell: ({ row }) => row.original.quantity,
        size: 100,
      },
      {
        accessorKey: "entryPrice",
        header: () => (
          <div className="font-medium">{t("trade-table.entryPrice")}</div>
        ),
        cell: ({ row }) =>
          row.original.entryPrice ? `$${row.original.entryPrice}` : "—",
        size: 120,
      },
      {
        accessorKey: "closePrice",
        header: () => (
          <div className="font-medium">{t("trade-table.exitPrice")}</div>
        ),
        cell: ({ row }) =>
          row.original.closePrice ? `$${row.original.closePrice}` : "—",
        size: 120,
      },
      {
        accessorKey: "pnl",
        header: () => (
          <div className="font-medium">{t("trade-table.pnl")}</div>
        ),
        cell: ({ row }) => {
          const pnl = row.original.pnl ?? 0;
          return (
            <span className={pnl >= 0 ? "text-green-600" : "text-red-600"}>
              ${pnl.toFixed(2)}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "commission",
        header: () => (
          <div className="font-medium">{t("calendar.modal.commission")}</div>
        ),
        cell: ({ row }) => `$${(row.original.commission ?? 0).toFixed(2)}`,
        size: 120,
      },
      {
        accessorKey: "timeInPosition",
        header: () => (
          <div className="font-medium">{t("trade-table.positionTime")}</div>
        ),
        cell: ({ row }) => parsePositionTime(row.original.timeInPosition || 0),
        size: 120,
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: previewTrades,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      size: 400,
      minSize: 100,
    },
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            {t("import.parse.tradesFormatted", {
              formatted: formattedCount,
              total: totalRows,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {isParsing
              ? t("import.parse.rowsProcessed", {
                  processed: rowsProcessed,
                  total: totalRows,
                })
              : parseKind === "orders"
                ? t("import.processing.ordersPaired")
                : t("import.processing.parsedFromColumns")}
          </p>
          {formattedCount > PARSE_PREVIEW_LIMIT && (
            <p className="text-xs text-muted-foreground">
              {t("import.table.showingFirst", {
                count: previewTrades.length,
                total: formattedCount,
              })}
            </p>
          )}
        </div>
        {isParsing && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
            <span className="text-xs font-medium text-green-600">
              {t("import.processing.parsing")}
            </span>
          </div>
        )}
        {!isParsing && formattedCount > 0 && !error && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-xs font-medium text-green-600">
              {t("import.processing.parseReady")}
            </span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <span className="text-xs font-medium text-red-600">
              {t("import.processing.batchFailed")}
            </span>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t("import.processing.batchFailed")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {totalRows > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("import.processing.processingProgress")}</span>
            <span>
              {totalRows === 0
                ? 0
                : Math.round((rowsProcessed / totalRows) * 100)}
              %
            </span>
          </div>
          <Progress
            value={totalRows === 0 ? 0 : (rowsProcessed / totalRows) * 100}
            className="h-2"
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background shadow-xs">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap px-4 py-3 text-left text-sm"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          </Table>
          <ScrollArea className="flex-1" ref={tableContainerRef}>
            <Table>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn("border-b transition-colors hover:bg-muted")}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="whitespace-nowrap px-4 py-2.5 text-sm"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      {t("import.processing.emptyTable")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {formattedCount > 0 && (
            <div className="border-t bg-muted/30">
              <Table>
                <TableBody>
                  <TableRow className="font-medium">
                    <TableCell className="px-4 py-3 text-sm font-semibold">
                      {t("trade-table.footer.totalPnl")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <span
                        className={
                          totals.totalPnl >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        ${totals.totalPnl.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-semibold">
                      {t("trade-table.footer.totalCommission")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      ${totals.totalCommission.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-semibold">
                      {t("trade-table.footer.netPnl")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <span
                        className={
                          totals.netPnl >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        ${totals.netPnl.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
