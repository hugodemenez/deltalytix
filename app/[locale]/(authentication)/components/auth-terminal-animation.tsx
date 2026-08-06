"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";

import DailyPnLChartEmbed, {
  type EmbedTrade,
} from "@/app/[locale]/embed/components/pnl-bar-chart";
import TradeDistributionChartEmbed from "@/app/[locale]/embed/components/trade-distribution";
import { SparkAreaChart } from "@/components/SparkChart";
import { Tracker } from "@/components/ui/tracker";
import { cn } from "@/lib/utils";
import {
  LOADING_MOCK_DATE_PNL,
  LOADING_MOCK_EQUITY,
} from "@/app/[locale]/dashboard/components/charts/chart-loading-skeleton";

const TICK_MS = 1600;
const VISIBLE_DAYS = 12;

const TICKER_ITEMS = [
  { symbol: "ES", change: "+0.42%", up: true },
  { symbol: "NQ", change: "+0.61%", up: true },
  { symbol: "YM", change: "−0.18%", up: false },
  { symbol: "RTY", change: "+0.27%", up: true },
  { symbol: "CL", change: "−0.54%", up: false },
  { symbol: "GC", change: "+0.33%", up: true },
] as const;

function seededPnl(seed: number) {
  const wave = Math.sin(seed * 0.7) * 280;
  const pulse = Math.cos(seed * 1.15) * 120;
  const noise = ((seed * 37) % 21) * 8 - 80;
  return Math.round(wave + pulse + noise);
}

function dateFromOffset(offset: number) {
  const date = new Date("2025-01-06T14:30:00.000Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString();
}

function buildSeedTrades(dayCount: number): EmbedTrade[] {
  const trades: EmbedTrade[] = [];
  for (let day = 0; day < dayCount; day += 1) {
    const dayPnl = LOADING_MOCK_DATE_PNL[day % LOADING_MOCK_DATE_PNL.length]?.pnl
      ?? seededPnl(day);
    const split = day % 3 === 0 ? 3 : 2;
    for (let i = 0; i < split; i += 1) {
      const slice = Math.round(dayPnl / split);
      trades.push({
        pnl: i === 0 ? dayPnl - slice * (split - 1) : slice,
        commission: 2.5,
        entryDate: dateFromOffset(day),
        side: (day + i) % 2 === 0 ? "long" : "short",
      });
    }
  }
  return trades;
}

function appendLiveDay(trades: EmbedTrade[], dayIndex: number): EmbedTrade[] {
  const pnl = seededPnl(dayIndex + 20);
  const nextTrades = [
    ...trades,
    {
      pnl: Math.round(pnl * 0.55),
      commission: 2.5,
      entryDate: dateFromOffset(dayIndex),
      side: dayIndex % 2 === 0 ? "long" : ("short" as const),
    },
    {
      pnl: Math.round(pnl * 0.45),
      commission: 2.5,
      entryDate: dateFromOffset(dayIndex),
      side: dayIndex % 2 === 0 ? "short" : ("long" as const),
    },
  ];

  const byDate = new Map<string, EmbedTrade[]>();
  for (const trade of nextTrades) {
    const key =
      typeof trade.entryDate === "string"
        ? trade.entryDate.slice(0, 10)
        : trade.entryDate?.toISOString().slice(0, 10);
    if (!key) continue;
    const bucket = byDate.get(key) ?? [];
    bucket.push(trade);
    byDate.set(key, bucket);
  }

  const keptDates = [...byDate.keys()].sort().slice(-VISIBLE_DAYS);
  return keptDates.flatMap((date) => byDate.get(date) ?? []);
}

export function AuthTerminalAnimation({ className }: { className?: string }) {
  const [trades, setTrades] = useState<EmbedTrade[]>(() =>
    buildSeedTrades(VISIBLE_DAYS),
  );
  const [dayIndex, setDayIndex] = useState(VISIBLE_DAYS);
  const [equityPoints, setEquityPoints] = useState(() =>
    LOADING_MOCK_EQUITY.map((point) => ({
      date: point.date,
      equity: point.equity,
    })),
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  const advanceFeed = useEffectEvent(() => {
    setDayIndex((current) => {
      const next = current + 1;
      setTrades((previous) => appendLiveDay(previous, next));
      setEquityPoints((previous) => {
        const last = previous[previous.length - 1]?.equity ?? 50000;
        const delta = seededPnl(next) * 0.35;
        return [
          ...previous.slice(1),
          {
            date: dateFromOffset(next).slice(0, 10),
            equity: Math.round(last + delta),
          },
        ];
      });
      return next;
    });
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = window.setInterval(advanceFeed, TICK_MS);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  const trackerData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const trade of trades) {
      if (!trade.entryDate) continue;
      const key =
        typeof trade.entryDate === "string"
          ? trade.entryDate.slice(0, 10)
          : trade.entryDate.toISOString().slice(0, 10);
      byDate.set(key, (byDate.get(key) ?? 0) + trade.pnl - (trade.commission ?? 0));
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
        hoverEffect: true,
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

  const animate = !prefersReducedMotion;

  return (
    <div
      className={cn(
        "dark pointer-events-auto absolute inset-0 overflow-hidden text-foreground",
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

      <div className="absolute inset-x-0 top-24 border-y border-white/[0.08] bg-background/40 backdrop-blur-[2px]">
        <div
          className={cn(
            "flex w-max gap-8 px-6 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
            animate && "auth-ticker-scroll",
          )}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
            <span key={`${item.symbol}-${index}`} className="flex items-center gap-2">
              <span className="text-[oklch(0.82_0.12_75)]">{item.symbol}</span>
              <span
                className={
                  item.up
                    ? "text-[hsl(var(--chart-win))]"
                    : "text-[hsl(var(--chart-loss))]"
                }
              >
                {item.change}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-6 top-36 bottom-32 flex min-h-0 flex-col gap-3 sm:inset-x-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Live dashboard preview
            </p>
            <p className="mt-1 text-xl tracking-[-0.04em] text-[oklch(0.82_0.12_75)]">
              DELT / SESSION
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-sm border border-white/10 bg-card/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground">
            <span
              className={cn(
                "size-1.5 rounded-full bg-[hsl(var(--chart-win))]",
                animate && "auth-live-pulse",
              )}
            />
            Live
          </div>
        </div>

        <DailyPnLChartEmbed
          trades={trades}
          animated={animate}
          showInfo={false}
          className="auth-panel-enter min-h-0 flex-1 !h-auto rounded-sm border-white/10 bg-card/80 shadow-none backdrop-blur-[2px]"
        />

        <div className="grid min-h-[168px] grid-cols-5 gap-3">
          <TradeDistributionChartEmbed
            trades={trades}
            animated={animate}
            showInfo={false}
            className="auth-panel-enter col-span-2 !h-full rounded-sm border-white/10 bg-card/80 shadow-none [animation-delay:80ms]"
          />

          <div className="auth-panel-enter col-span-3 flex h-full flex-col gap-3 [animation-delay:140ms]">
            <div className="group flex min-h-0 flex-1 flex-col rounded-sm border border-white/10 bg-card/80 p-3 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/20">
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
                  animated={animate}
                  className="h-[72px]"
                />
              </div>
              <Tracker
                className="mt-3 h-6"
                data={trackerData}
                hoverEffect
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
                <button
                  key={stat.id}
                  type="button"
                  onMouseEnter={() => setHoveredStat(stat.id)}
                  onMouseLeave={() => setHoveredStat(null)}
                  className={cn(
                    "rounded-sm border border-white/10 bg-card/80 px-2.5 py-2 text-left transition-[border-color,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-white/20 active:scale-[0.98]",
                    hoveredStat === stat.id && "bg-card",
                  )}
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
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[oklch(0.17_0_0)] via-[oklch(0.17_0_0)]/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[oklch(0.17_0_0)] via-[oklch(0.17_0_0)]/90 to-transparent" />

      <style jsx global>{`
        @keyframes auth-ticker-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .auth-ticker-scroll {
          animation: auth-ticker-scroll 28s linear infinite;
        }

        @keyframes auth-live-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.45;
            transform: scale(0.85);
          }
        }

        .auth-live-pulse {
          animation: auth-live-pulse 1.6s ease-in-out infinite;
        }

        @keyframes auth-panel-enter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .auth-panel-enter {
          animation: auth-panel-enter 520ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-ticker-scroll,
          .auth-live-pulse,
          .auth-panel-enter {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
