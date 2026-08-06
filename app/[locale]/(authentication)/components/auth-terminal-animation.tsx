"use client";

import { useMemo, useState } from "react";

import DailyPnLChartEmbed, {
  type EmbedTrade,
} from "@/app/[locale]/embed/components/pnl-bar-chart";
import TradeDistributionChartEmbed from "@/app/[locale]/embed/components/trade-distribution";
import { SparkAreaChart } from "@/components/SparkChart";
import { Tracker } from "@/components/ui/tracker";
import { cn } from "@/lib/utils";

const VISIBLE_DAYS = 12;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function dateFromOffset(offset: number) {
  const date = new Date();
  date.setUTCHours(15, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (VISIBLE_DAYS - 1 - offset));
  return date.toISOString();
}

function buildRandomTrades(dayCount: number): EmbedTrade[] {
  const trades: EmbedTrade[] = [];

  for (let day = 0; day < dayCount; day += 1) {
    const dayPnl = Math.round(randomBetween(-420, 640));
    const split = Math.random() > 0.55 ? 3 : 2;

    for (let i = 0; i < split; i += 1) {
      const slice = Math.round(dayPnl / split);
      trades.push({
        pnl: i === 0 ? dayPnl - slice * (split - 1) : slice,
        commission: Number(randomBetween(1.5, 4.5).toFixed(2)),
        entryDate: dateFromOffset(day),
        side: Math.random() > 0.5 ? "long" : "short",
      });
    }
  }

  return trades;
}

function buildRandomEquity(trades: EmbedTrade[]) {
  const byDate = new Map<string, number>();
  for (const trade of trades) {
    if (!trade.entryDate) continue;
    const key =
      typeof trade.entryDate === "string"
        ? trade.entryDate.slice(0, 10)
        : trade.entryDate.toISOString().slice(0, 10);
    byDate.set(
      key,
      (byDate.get(key) ?? 0) + trade.pnl - (trade.commission ?? 0),
    );
  }

  let equity = Math.round(randomBetween(48000, 56000));
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => {
      equity += pnl;
      return { date, equity: Math.round(equity) };
    });
}

export function AuthTerminalAnimation({ className }: { className?: string }) {
  const [trades] = useState(() => buildRandomTrades(VISIBLE_DAYS));
  const equityPoints = useMemo(() => buildRandomEquity(trades), [trades]);

  const trackerData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const trade of trades) {
      if (!trade.entryDate) continue;
      const key =
        typeof trade.entryDate === "string"
          ? trade.entryDate.slice(0, 10)
          : trade.entryDate.toISOString().slice(0, 10);
      byDate.set(
        key,
        (byDate.get(key) ?? 0) + trade.pnl - (trade.commission ?? 0),
      );
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pnl]) => ({
        key: date,
        color:
          pnl >= 0
            ? "bg-[hsl(var(--chart-win))]"
            : "bg-[hsl(var(--chart-loss))]",
        tooltip: `${date}: ${pnl >= 0 ? "+" : ""}${Math.round(pnl)}`,
      }));
  }, [trades]);

  const sessionPnl = useMemo(
    () =>
      trades.reduce(
        (sum, trade) => sum + trade.pnl - (trade.commission ?? 0),
        0,
      ),
    [trades],
  );

  const winRate = useMemo(() => {
    if (trades.length === 0) return 0;
    const wins = trades.filter(
      (trade) => trade.pnl - (trade.commission ?? 0) > 0,
    ).length;
    return Math.round((wins / trades.length) * 100);
  }, [trades]);

  return (
    <div
      aria-hidden
      className={cn(
        "dark pointer-events-none absolute inset-0 overflow-hidden text-foreground",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[oklch(0.17_0_0)]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="absolute inset-x-6 top-28 bottom-32 flex min-h-0 flex-col gap-3 sm:inset-x-8 sm:top-32">
        <DailyPnLChartEmbed
          trades={trades}
          showInfo={false}
          className="min-h-0 flex-1 !h-auto rounded-sm border-white/10 bg-card/80 shadow-none"
        />

        <div className="grid min-h-[168px] grid-cols-5 gap-3">
          <TradeDistributionChartEmbed
            trades={trades}
            showInfo={false}
            className="col-span-2 !h-full rounded-sm border-white/10 bg-card/80 shadow-none"
          />

          <div className="col-span-3 flex h-full flex-col gap-3">
            <div className="flex min-h-0 flex-1 flex-col rounded-sm border border-white/10 bg-card/80 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Equity</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Spark
                </p>
              </div>
              <div className="min-h-0 flex-1">
                <SparkAreaChart
                  data={equityPoints}
                  index="date"
                  categories={["equity"]}
                  colors={{ equity: "hsl(var(--chart-win))" }}
                  height={72}
                  className="h-[72px]"
                />
              </div>
              <Tracker
                className="mt-3 h-6"
                data={trackerData}
                defaultBackgroundColor="bg-muted"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: "session",
                  label: "Session",
                  value: `${sessionPnl >= 0 ? "+" : ""}${Math.round(sessionPnl).toLocaleString("en-US")}`,
                  tone: sessionPnl >= 0 ? "win" : "loss",
                },
                {
                  id: "winrate",
                  label: "Win rate",
                  value: `${winRate}%`,
                  tone: winRate >= 50 ? "win" : "loss",
                },
                {
                  id: "trades",
                  label: "Trades",
                  value: String(trades.length),
                  tone: "amber",
                },
              ].map((stat) => (
                <div
                  key={stat.id}
                  className="rounded-sm border border-white/10 bg-card/80 px-2.5 py-2"
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-mono text-sm tabular-nums tracking-tight",
                      stat.tone === "win" && "text-[hsl(var(--chart-win))]",
                      stat.tone === "loss" && "text-[hsl(var(--chart-loss))]",
                      stat.tone === "amber" && "text-[oklch(0.82_0.12_75)]",
                    )}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[oklch(0.17_0_0)] via-[oklch(0.17_0_0)]/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[oklch(0.17_0_0)] via-[oklch(0.17_0_0)]/90 to-transparent" />
    </div>
  );
}
