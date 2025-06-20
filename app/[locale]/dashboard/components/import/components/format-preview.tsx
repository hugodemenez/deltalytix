"use client";

import { Trade } from "@prisma/client";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isValid } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils"; // Assuming you have a utility for className merging
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ChevronDown } from "lucide-react";
import { parsePositionTime } from "@/lib/utils";
import { useI18n } from "@/locales/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { tradeSchema } from '@/app/api/imports/ibkr/format-trades/schema'
import { z } from 'zod'
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormatPreviewProps {
  trades: string[][];
  processedTrades: Trade[];
  setProcessedTrades: (trades: Trade[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
  headers: string[];
  mappings: { [key: string]: string };
}

function transformHeaders(headers: string[], mappings: { [key: string]: string }): string[] {
  return headers.map(header => {
    const mappingKey = Object.keys(mappings).find(key => key === header);
    return mappingKey ? mappings[mappingKey] : header;
  });
}


export function FormatPreview({
  trades: initialTrades,
  processedTrades,
  setProcessedTrades,
  setIsLoading,
  isLoading,
  headers,
  mappings,
}: FormatPreviewProps) {
  const t = useI18n();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Transform headers using mappings
  const transformedHeaders = useMemo(() => transformHeaders(headers, mappings), [headers, mappings]);

  // Calculate valid trades only when initialTrades changes
  const validTrades = useMemo(() =>
    initialTrades.filter(row => row.length > 0 && row[0] !== ""),
    [initialTrades]
  );

  const [error, setError] = useState<string | null>(null);
  const [currentBatch, setCurrentBatch] = useState(0);
  const batchSize = 10;
  const totalBatches = Math.ceil(validTrades.length / batchSize);

  const handleLoadMore = () => {
    setCurrentBatch(prev => Math.min(prev + 1, totalBatches - 1));
    submit({
      headers: transformedHeaders,
      rows: batchToProcess
    });
  };

  const batchToProcess = useMemo(() => {
    const startIndex = currentBatch * batchSize;
    const endIndex = Math.min(startIndex + batchSize, validTrades.length);
    return validTrades.slice(startIndex, endIndex);
  }, [currentBatch, validTrades, batchSize]);

  const { object, submit, isLoading: isProcessing } = useObject({
    api: '/api/ai/format-trades',
    schema: z.array(tradeSchema),
    onError(error) {
      console.error('Error processing trades:', error);
      setError(`Failed to process trades: ${error.message}`);
    }
  });


  useEffect(() => {
    if (object) {
      const newTrades = object.filter((trade): trade is NonNullable<typeof trade> => trade !== undefined) as Trade[];
      const uniqueTrades = newTrades.filter(newTrade =>
        !processedTrades.some(existingTrade =>
          existingTrade.entryDate === newTrade.entryDate &&
          existingTrade.instrument === newTrade.instrument &&
          existingTrade.quantity === newTrade.quantity
        )
      );
      setProcessedTrades([...processedTrades, ...uniqueTrades]);
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [object])

  const columns = useMemo<ColumnDef<Partial<Trade>>[]>(() => [
    {
      accessorKey: "entryDate",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.entryDate')}</div>
      ),
      cell: ({ row }) => {
        const entryDate = row.original.entryDate ? new Date(row.original.entryDate) : null;
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'entryDate')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {entryDate && isValid(entryDate) ? format(entryDate, "yyyy-MM-dd HH:mm") : "Invalid Date"}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 180,
    },
    {
      accessorKey: "instrument",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.instrument')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'instrument')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {row.original.instrument}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "side",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.direction')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'side')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="capitalize">{row.original.side}</span>
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 100,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.quantity')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'quantity')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {row.original.quantity}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 100,
    },
    {
      accessorKey: "entryPrice",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.entryPrice')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'entryPrice')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                ${row.original.entryPrice}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "closePrice",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.exitPrice')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'closePrice')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                ${row.original.closePrice}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.pnl')}</div>
      ),
      cell: ({ row }) => {
        const pnl = row.original.pnl ?? 0;
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'pnl')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className={pnl >= 0 ? "text-green-600" : "text-red-600"}>
                  ${pnl.toFixed(2)}
                </span>
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "commission",
      header: ({ column }) => (
        <div className="font-medium">{t('calendar.modal.commission')}</div>
      ),
      cell: ({ row }) => {
        const commission = row.original.commission ?? 0;
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'commission')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                ${commission.toFixed(2)}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      accessorKey: "timeInPosition",
      header: ({ column }) => (
        <div className="font-medium">{t('trade-table.positionTime')}</div>
      ),
      cell: ({ row }) => {
        const originalData = validTrades[row.index]?.[headers.findIndex(h => mappings[h] === 'timeInPosition')];
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {parsePositionTime(row.original.timeInPosition || 0)}
              </TooltipTrigger>
              {originalData && (
                <TooltipContent>
                  <p>Original: {originalData}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
  ], [t, validTrades, headers, mappings]);

  const table = useReactTable({
    data: processedTrades,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      size: 400,
      minSize: 100,
    },
  });

  const scrollToBottom = () => {
    if (tableContainerRef.current) {
      const scrollContainer = tableContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };



  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center">
        <p className="text-sm text-muted-foreground">
          {processedTrades.filter(trade => trade.entryDate).length} of {validTrades.length} trades formatted
        </p>
        <Button
          variant="outline"
          className="ml-2 hover:bg-muted hover:cursor-pointer"
          onClick={handleLoadMore}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Start formatting"}
        </Button>
        <Badge variant="destructive" className="ml-2 hover:bg-muted hover:cursor-pointer"
          onClick={() => {
            setCurrentBatch(0)
            setProcessedTrades([])
          }}
        >
          Reset
        </Badge>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
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
                          header.getContext()
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
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "border-b transition-colors hover:bg-muted",
                          row.getIsExpanded()
                            ? "bg-muted"
                            : row.getCanExpand()
                              ? ""
                              : "bg-muted/50"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="whitespace-nowrap px-4 py-2.5 text-sm"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                ) : isProcessing || (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
                {isProcessing && (
                  <TableRow>
                    {columns.map((column, index) => (
                      <TableCell
                        key={`loading-${index}`}
                        className="whitespace-nowrap px-4 py-2.5 text-sm"
                        style={{ width: column.size }}
                      >
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}