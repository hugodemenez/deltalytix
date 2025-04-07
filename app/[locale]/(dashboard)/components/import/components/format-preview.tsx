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
import { ArrowDownToLine } from "lucide-react";

interface FormatPreviewProps {
  trades: string[][];
  processedTrades: Trade[];
  setProcessedTrades: (trades: Trade[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
  headers: string[];
  mappings: { [key: string]: string };
}

function TradeCell({ value, render }: { value: any; render: (v: any) => React.ReactNode }) {
  const [displayValue, setDisplayValue] = useState<any>(undefined);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (value !== undefined && value !== displayValue) {
      setShouldAnimate(true);
      setDisplayValue(value);
      const timeout = setTimeout(() => setShouldAnimate(false), 300); // Match animation duration
      return () => clearTimeout(timeout);
    }
  }, [value, displayValue]);

  return (
    <TableCell className={cn(shouldAnimate && "animate-in")}>
      {displayValue !== undefined ? render(displayValue) : <Skeleton className="h-4 w-full" />}
    </TableCell>
  );
}

function TradeRow({ trade }: { trade: Partial<Trade> }) {
  const entryDate = trade.entryDate ? new Date(trade.entryDate) : null;

  return (
    <TableRow>
      <TradeCell
        value={entryDate && isValid(entryDate) ? format(entryDate, "yyyy-MM-dd HH:mm") : undefined}
        render={v => v || "Invalid Date"}
      />
      <TradeCell value={trade.instrument} render={v => v} />
      <TradeCell value={trade.side} render={v => <span className="capitalize">{v}</span>} />
      <TradeCell value={trade.quantity} render={v => v} />
      <TradeCell value={trade.entryPrice} render={v => `$${v}`} />
      <TradeCell value={trade.closePrice} render={v => `$${v}`} />
      <TradeCell
        value={trade.pnl}
        render={v => (
          <span className={v >= 0 ? "text-green-600" : "text-red-600"}>${v.toFixed(2)}</span>
        )}
      />
      <TradeCell value={trade.commission} render={v => `$${v.toFixed(2)}`} />
    </TableRow>
  );
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
  // Calculate valid trades only when initialTrades changes
  const validTrades = useMemo(() => 
    initialTrades.filter(row => row.length > 0 && row[0] !== ""),
    [initialTrades]
  );

  const [error, setError] = useState<string | null>(null);
  const [currentBatch, setCurrentBatch] = useState(0);
  const batchSize = 10;
  const totalBatches = Math.ceil(validTrades.length / batchSize);

  const [trades, setTrades] = useState<Partial<Trade>[]>(() =>
    Array(batchSize).fill({})
  );
  const [autoScroll, setAutoScroll] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = () => {
    setCurrentBatch(prev => Math.min(prev + 1, totalBatches - 1));
  };

  const batchToProcess = useMemo(() => {
    const startIndex = currentBatch * batchSize;
    const endIndex = Math.min(startIndex + batchSize, validTrades.length);
    return validTrades.slice(startIndex, endIndex);
  }, [currentBatch, validTrades, batchSize]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    // Initialize trades array with the current batch size
    if (currentBatch === 0) {
      setTrades(Array(batchSize).fill({}));
    }

    let mounted = true;

    const startStreaming = async () => {
      try {
        const response = await fetch("/api/format-trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headers, rows: batchToProcess, mappings }),
        });

        if (!response.ok || !response.body) throw new Error("Streaming failed");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (mounted) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const event = JSON.parse(line.slice(6));
              if (event.type === "partial") {
                const actualIndex = currentBatch * batchSize + event.index;
                if (actualIndex < validTrades.length) {
                  setTrades(prev => {
                    const newTrades = [...prev];
                    newTrades[actualIndex] = { ...newTrades[actualIndex], ...event.data };
                    return newTrades;
                  });
                }
              } else if (event.type === "complete") {
                console.log('[FormatPreview] Complete trades:', event.data);
                setProcessedTrades([...processedTrades, ...event.data]);
                break;
              } else if (event.type === "error") {
                setError(event.message);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error("Streaming error:", err);
        if (mounted) setError("Failed to process trades");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    startStreaming();

    return () => {
      mounted = false;
      setIsLoading(false);
    };
  }, [setIsLoading, headers, validTrades, mappings, setProcessedTrades, batchToProcess]);

  // Auto-scroll to bottom when new trades are added
  useEffect(() => {
    if (autoScroll && tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [trades, autoScroll]);

  // Handle manual scroll
  const handleScroll = () => {
    if (tableRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = tableRef.current;
      const isAtBottom = scrollHeight - scrollTop === clientHeight;
      setAutoScroll(isAtBottom);
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
      <div className="text-sm text-muted-foreground">
        {trades.filter(trade => trade.entryDate).length} of {validTrades.length} trades formatted
      </div>
      <div className="flex-1 overflow-auto relative" ref={tableRef} onScroll={handleScroll}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead className="w-[120px]">Instrument</TableHead>
              <TableHead className="w-[100px]">Side</TableHead>
              <TableHead className="w-[100px]">Quantity</TableHead>
              <TableHead className="w-[120px]">Entry Price</TableHead>
              <TableHead className="w-[120px]">Exit Price</TableHead>
              <TableHead className="w-[120px]">PnL</TableHead>
              <TableHead className="w-[120px]">Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, index) => (
              <TradeRow key={index} trade={trade} />
            ))}
          </TableBody>
        </Table>
        {!autoScroll && (
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg"
            onClick={() => {
              setAutoScroll(true);
              if (tableRef.current) {
                tableRef.current.scrollTop = tableRef.current.scrollHeight;
              }
            }}
          >
            <ArrowDownToLine className="h-4 w-4" />
          </Button>
        )}
      </div>
      {currentBatch < totalBatches - 1 && (
        <div className="flex justify-center">
          <Button 
            onClick={handleLoadMore}
            disabled={isLoading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}