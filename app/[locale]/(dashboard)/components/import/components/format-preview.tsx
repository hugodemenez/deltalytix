"use client";

import { Trade } from "@prisma/client";
import { useEffect, useState } from "react";
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
      {displayValue !== undefined ? render(displayValue) : <Skeleton className="h-4 w-16" />}
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
  const [trades, setTrades] = useState<Partial<Trade>[]>(() =>
    Array(initialTrades.length).fill({})
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {


    setIsLoading(true);
    setError(null);
    setTrades(Array(initialTrades.length).fill({}));

    let mounted = true;

    const startStreaming = async () => {
      try {
        const response = await fetch("/api/format-trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headers, rows: initialTrades, mappings }),
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
              if (event.type === "partial" && event.index < initialTrades.length) {
                setTrades(prev => {
                  const newTrades = [...prev];
                  newTrades[event.index] = { ...newTrades[event.index], ...event.data };
                  return newTrades;
                });
              } else if (event.type === "complete") {
                setTrades(event.data);
                console.log('[FormatPreview] Complete trades:', event.data);
                setProcessedTrades(event.data);
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
  }, [setIsLoading, headers, initialTrades, mappings, setProcessedTrades]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Exit Price</TableHead>
              <TableHead>PnL</TableHead>
              <TableHead>Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.slice(0, 25).map((trade, index) => (
              <TradeRow key={index} trade={trade} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}