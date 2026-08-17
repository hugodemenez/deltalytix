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
  planFromHeaders,
  type ExecutedTrade,
  type ParsePlan,
} from "@/lib/import/parse-plan";
import { obtainAgentParseScript } from "@/lib/import/obtain-agent-script";
import { streamDelimitedFile } from "@/lib/import/stream-delimited-file";
import type { ParseScriptSession } from "@/lib/import/parse-script";

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

type ParserPhase = "writing" | "checking" | "reading" | "ready" | "error";

interface FormatPreviewProps {
  trades: string[][];
  processedTrades: Partial<Trade>[];
  setProcessedTrades: (trades: Partial<Trade>[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
  headers: string[];
  mappings: { [key: string]: string };
  importFile?: File | null;
  delimiter?: string;
  peekText?: string;
}

export function FormatPreview({
  trades: initialTrades,
  processedTrades: _processedTrades,
  setProcessedTrades,
  setIsLoading,
  headers,
  mappings: _mappings,
  importFile = null,
  delimiter = ",",
  peekText,
}: FormatPreviewProps) {
  const t = useI18n();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseKind, setParseKind] = useState<"closed-trades" | "orders" | "script" | null>(
    null,
  );
  const [previewTrades, setPreviewTrades] = useState<Partial<Trade>[]>([]);
  const [formattedCount, setFormattedCount] = useState(0);
  const [rowsProcessed, setRowsProcessed] = useState(0);
  const [bytesRead, setBytesRead] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [phase, setPhase] = useState<ParserPhase>("writing");
  const [agentScript, setAgentScript] = useState<string | null>(null);
  const [totals, setTotals] = useState({
    totalPnl: 0,
    totalCommission: 0,
    netPnl: 0,
  });

  const fileSize = importFile?.size ?? 0;

  useEffect(() => {
    let cancelled = false;

    const applyTrades = (
      all: ExecutedTrade[],
      incoming: ExecutedTrade[],
      processedRows: number,
      readBytes: number,
    ) => {
      for (const trade of incoming) {
        all.push(trade);
      }
      const totalsFromAll = all.reduce(
        (acc, trade) => {
          acc.totalPnl += trade.pnl || 0;
          acc.totalCommission += trade.commission || 0;
          return acc;
        },
        { totalPnl: 0, totalCommission: 0 },
      );
      setRowsProcessed(processedRows);
      setBytesRead(readBytes);
      setFormattedCount(all.length);
      setPreviewTrades(all.slice(0, PARSE_PREVIEW_LIMIT));
      setTotals({
        totalPnl: totalsFromAll.totalPnl,
        totalCommission: totalsFromAll.totalCommission,
        netPnl: totalsFromAll.totalPnl - totalsFromAll.totalCommission,
      });
    };

    const finish = (all: ExecutedTrade[]) => {
      if (cancelled) return;
      setProcessedTrades(all);
      setIsParsing(false);
      setIsLoading(false);
      setPhase(all.length === 0 ? "error" : "ready");
      if (all.length === 0) {
        setError(t("import.processing.noTradesFormatted"));
      }
    };

    const runPlanChunks = async (plan: ParsePlan, rows: string[][]) => {
      setParseKind(plan.kind);
      const session = createParsePlanSession();
      const all: ExecutedTrade[] = [];
      let processed = 0;
      for (let offset = 0; offset < rows.length; offset += PARSE_PLAN_CHUNK_SIZE) {
        if (cancelled) return;
        const { trades } = executeParsePlanChunk(
          rows.slice(offset, offset + PARSE_PLAN_CHUNK_SIZE),
          plan,
          session,
        );
        processed = Math.min(offset + PARSE_PLAN_CHUNK_SIZE, rows.length);
        applyTrades(all, trades, processed, 0);
        await yieldToMain();
      }
      finish(all);
    };

    const runFileWithPlan = async (plan: ParsePlan, file: File) => {
      setParseKind(plan.kind);
      const session = createParsePlanSession();
      const all: ExecutedTrade[] = [];
      let processed = 0;
      await streamDelimitedFile(file, {
        delimiter,
        headers,
        onChunk: async (rows, readBytes) => {
          if (cancelled) return;
          const { trades } = executeParsePlanChunk(rows, plan, session);
          processed += rows.length;
          applyTrades(all, trades, processed, readBytes);
          await yieldToMain();
        },
      });
      finish(all);
    };

    const runFileWithScript = async (script: string, file: File) => {
      setParseKind("script");
      setAgentScript(script);
      const all: ExecutedTrade[] = [];
      let session: ParseScriptSession = {};
      let sandboxName: string | undefined;
      let processed = 0;
      await streamDelimitedFile(file, {
        delimiter,
        headers,
        onChunk: async (rows, readBytes) => {
          if (cancelled) return;
          const response = await fetch("/api/import/parse-chunk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ script, rows, session, sandboxName }),
          });
          const raw = await response.text();
          if (!response.ok) throw new Error(raw);
          const result = JSON.parse(raw) as {
            trades: ExecutedTrade[];
            session: ParseScriptSession;
            sandboxName?: string;
          };
          session = result.session;
          sandboxName = result.sandboxName;
          processed += rows.length;
          applyTrades(all, result.trades, processed, readBytes);
          await yieldToMain();
        },
      });
      finish(all);
    };

    const start = async () => {
      setError(null);
      setIsParsing(true);
      setIsLoading(true);
      setPreviewTrades([]);
      setFormattedCount(0);
      setRowsProcessed(0);
      setBytesRead(0);
      setAgentScript(null);
      setTotals({ totalPnl: 0, totalCommission: 0, netPnl: 0 });
      setProcessedTrades([]);
      setPhase("writing");

      const plan = planFromHeaders(headers);
      const sourceRows = initialTrades;

      try {
        if (isParsePlanComplete(plan)) {
          setPhase("reading");
          if (importFile) {
            await runFileWithPlan(plan, importFile);
            return;
          }
          await runPlanChunks(plan, sourceRows);
          return;
        }

        setPhase("checking");
        const script = await obtainAgentParseScript({
          headers,
          rows: sourceRows.slice(0, 8),
          peekText,
        });
        if (cancelled) return;
        setPhase("reading");
        if (importFile) {
          await runFileWithScript(script, importFile);
          return;
        }
        const response = await fetch("/api/import/parse-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script, rows: sourceRows, session: {} }),
        });
        const raw = await response.text();
        if (!response.ok) throw new Error(raw);
        const result = JSON.parse(raw) as { trades: ExecutedTrade[] };
        applyTrades([], result.trades, sourceRows.length, 0);
        finish(result.trades);
      } catch (caught) {
        if (cancelled) return;
        const code =
          caught instanceof Error
            ? parseFormatTradesApiError(caught.message).code || caught.message
            : "";
        setError(
          code === AI_UNAVAILABLE_ERROR
            ? t("import.processing.aiUnavailable")
            : t("import.processing.noTradesFormatted"),
        );
        setProcessedTrades([]);
        setIsParsing(false);
        setIsLoading(false);
        setPhase("error");
      }
    };

    void start();
    return () => {
      cancelled = true;
    };
  }, [
    headers,
    initialTrades,
    importFile,
    delimiter,
    peekText,
    setProcessedTrades,
    setIsLoading,
    t,
  ]);

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
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {phase === "writing"
              ? t("import.processing.writingParser")
              : phase === "checking"
                ? t("import.processing.checkingSample")
                : isParsing
                  ? t("import.parse.rowsRead", {
                      processed: rowsProcessed,
                    })
                  : parseKind === "script"
                    ? t("import.processing.parserFromAgent")
                    : parseKind === "orders"
                      ? t("import.processing.ordersPaired")
                      : t("import.processing.parsedFromColumns")}
          </p>
          {agentScript && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">
                {t("import.parse.scriptLabel")}
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-sm bg-muted/50 p-2 font-mono text-[11px] leading-relaxed">
                {agentScript}
              </pre>
            </details>
          )}
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
              {phase === "writing"
                ? t("import.processing.writingParser")
                : phase === "checking"
                  ? t("import.processing.checkingSample")
                  : t("import.processing.readingFile")}
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

      {(fileSize > 0 || rowsProcessed > 0 || isParsing) && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("import.processing.processingProgress")}</span>
            <span>
              {fileSize > 0
                ? Math.round((Math.min(bytesRead, fileSize) / fileSize) * 100)
                : isParsing
                  ? 0
                  : 100}
              %
            </span>
          </div>
          <Progress
            value={
              fileSize > 0
                ? (Math.min(bytesRead, fileSize) / fileSize) * 100
                : isParsing
                  ? 0
                  : 100
            }
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
