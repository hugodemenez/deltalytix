"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { cn } from "@/lib/utils";

const BAR_COUNT = 28;
const TICK_MS = 1100;
const TICKER_ITEMS = [
  { symbol: "ES", change: "+0.42%", up: true },
  { symbol: "NQ", change: "+0.61%", up: true },
  { symbol: "YM", change: "−0.18%", up: false },
  { symbol: "RTY", change: "+0.27%", up: true },
  { symbol: "CL", change: "−0.54%", up: false },
  { symbol: "GC", change: "+0.33%", up: true },
  { symbol: "EUR", change: "+0.09%", up: true },
  { symbol: "BTC", change: "−1.12%", up: false },
] as const;

type Bar = {
  id: number;
  value: number;
};

function seededBar(seed: number): number {
  const wave = Math.sin(seed * 0.55) * 0.35;
  const pulse = Math.cos(seed * 1.3) * 0.2;
  const noise = ((seed * 17) % 10) / 25 - 0.2;
  return Math.max(-1, Math.min(1, wave + pulse + noise));
}

function createBars(startId: number): Bar[] {
  return Array.from({ length: BAR_COUNT }, (_, index) => ({
    id: startId + index,
    value: seededBar(startId + index),
  }));
}

function formatPnl(value: number) {
  const scaled = Math.round(value * 1840);
  const sign = scaled > 0 ? "+" : "";
  return `${sign}${scaled.toLocaleString("en-US")}`;
}

export function AuthTerminalAnimation({ className }: { className?: string }) {
  const [bars, setBars] = useState<Bar[]>(() => createBars(0));
  const [clock, setClock] = useState("09:31:04");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const advanceFeed = useEffectEvent(() => {
    setBars((previous) => {
      const incomingId = (previous[previous.length - 1]?.id ?? 0) + 1;
      return [
        ...previous.slice(1),
        { id: incomingId, value: seededBar(incomingId) },
      ];
    });

    const now = new Date();
    setClock(
      now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    );
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

  const latest = bars[bars.length - 1]?.value ?? 0;
  const latestId = bars[bars.length - 1]?.id ?? 0;
  const sessionPnl = bars.reduce((sum, bar) => sum + bar.value, 0);
  const winRate =
    bars.filter((bar) => bar.value >= 0).length / Math.max(bars.length, 1);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden text-[oklch(0.93_0_0)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[oklch(0.17_0_0)]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="absolute inset-x-0 top-24 border-y border-white/[0.08] bg-[oklch(0.2_0_0)]/80">
        <div
          className={cn(
            "flex w-max gap-8 px-6 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55",
            !prefersReducedMotion && "auth-ticker-scroll",
          )}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
            <span key={`${item.symbol}-${index}`} className="flex items-center gap-2">
              <span className="text-[oklch(0.82_0.12_75)]">{item.symbol}</span>
              <span
                className={
                  item.up
                    ? "text-[oklch(0.78_0.12_155)]"
                    : "text-[oklch(0.72_0.14_25)]"
                }
              >
                {item.change}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-8 top-40 bottom-36 flex flex-col gap-4 sm:inset-x-10">
        <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
              Session tape
            </p>
            <p className="mt-1 text-2xl font-normal tracking-[-0.04em] text-[oklch(0.82_0.12_75)]">
              DELT / LIVE
            </p>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
            <p>UTC {clock}</p>
            <p
              className={cn(
                "mt-1 text-sm tracking-normal tabular-nums",
                latest >= 0
                  ? "text-[oklch(0.78_0.12_155)]"
                  : "text-[oklch(0.72_0.14_25)]",
              )}
            >
              {formatPnl(latest)}
            </p>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col rounded-sm border border-white/[0.08] bg-[oklch(0.19_0_0)]/70 p-4">
          <div className="mb-3 flex shrink-0 items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
            <span>Daily P&amp;L</span>
            <span>28 bars</span>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((line) => (
                <div key={line} className="border-t border-white/[0.06]" />
              ))}
            </div>

            <div className="absolute inset-0 flex items-stretch gap-[3px] px-1 pb-1 pt-2">
              {bars.map((bar) => {
                const height = `${12 + Math.abs(bar.value) * 82}%`;
                const positive = bar.value >= 0;
                return (
                  <div
                    key={bar.id}
                    className="flex min-h-0 min-w-0 flex-1 items-end justify-center"
                  >
                    <div
                      className={cn(
                        "w-full max-w-[14px] origin-bottom rounded-[1px] transition-[height,background-color] duration-700 ease-out motion-reduce:transition-none",
                        positive
                          ? "bg-[oklch(0.78_0.12_155)]"
                          : "bg-[oklch(0.72_0.14_25)]",
                        !prefersReducedMotion && "auth-bar-enter",
                      )}
                      style={{ height }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Session",
              value: formatPnl(sessionPnl / 4),
              up: sessionPnl >= 0,
            },
            {
              label: "Win rate",
              value: `${Math.round(winRate * 100)}%`,
              up: winRate >= 0.5,
            },
            {
              label: "Trades",
              value: String(84 + (latestId % 17)),
              up: true,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-sm border border-white/[0.08] bg-[oklch(0.19_0_0)]/70 px-3 py-2.5"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
                {stat.label}
              </p>
              <p
                className={cn(
                  "mt-1 font-mono text-sm tabular-nums tracking-tight",
                  stat.up
                    ? "text-[oklch(0.82_0.12_75)]"
                    : "text-[oklch(0.72_0.14_25)]",
                )}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[oklch(0.17_0_0)] via-[oklch(0.17_0_0)]/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[oklch(0.17_0_0)] via-[oklch(0.17_0_0)]/85 to-transparent" />

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

        @keyframes auth-bar-enter {
          from {
            opacity: 0.35;
            transform: scaleY(0.72);
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }

        .auth-bar-enter {
          transform-origin: bottom;
          animation: auth-bar-enter 520ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-ticker-scroll,
          .auth-bar-enter {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
