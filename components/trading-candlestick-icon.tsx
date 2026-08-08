'use client';

import { useEffect, useId, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

/** Lifetime of one bar before the next one opens. */
const BAR_MS = 2200;
/** Price prints inside one bar. Discrete on purpose — a live feed ticks, it doesn't ease. */
const TICKS_PER_BAR = 26;
/** Horizontal distance between bar centres, in view units. */
const PITCH = 10;
/** Standard candlestick proportions: body ~60% of pitch, wick ~1/6 of the body. */
const BODY_WIDTH = PITCH * 0.6;
const WICK_WIDTH = BODY_WIDTH / 6;
/** How fast the y-axis catches up when the visible range changes. */
const SCALE_TAU_MS = 650;
/** Guards against the series jumping minutes ahead after the tab was backgrounded. */
const MAX_FRAME_MS = 100;

const DEFAULT_VISIBLE_BARS = 3;
const UP_COLOR = "hsl(var(--chart-win))";
const DOWN_COLOR = "hsl(var(--chart-loss))";

/* ------------------------------------------------------------------ series */

/** Deterministic PRNG so the chart is identical on every mount. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Bar = {
  open: number;
  close: number;
  /** Price at each print. `ticks[0]` is the open, `ticks[TICKS_PER_BAR]` the close. */
  ticks: number[];
  /** Running high/low up to each print — the wick extremes as they were known then. */
  runHigh: number[];
  runLow: number[];
};

/**
 * Random walk with volatility clustering and mean reversion, sampled at tick
 * resolution. The wick extremes fall out of the walk rather than being drawn
 * first and animated into, which is what makes the print read as real data.
 */
function createSeries(seed: number) {
  const rand = mulberry32(seed);
  /** Approximately normal, cheap. */
  const shock = () => rand() + rand() + rand() - 1.5;

  let price = 0;
  let vol = 1;
  let trend = 0;

  return function nextBar(): Bar {
    vol = Math.min(1.9, Math.max(0.55, vol * (0.86 + rand() * 0.32)));
    trend = trend * 0.72 + shock() * 0.55 - price * 0.05;

    const open = price;
    const drift = trend / TICKS_PER_BAR;
    const ticks = [open];
    const runHigh = [open];
    const runLow = [open];

    for (let i = 1; i <= TICKS_PER_BAR; i += 1) {
      price += drift + shock() * 0.22 * vol;
      ticks.push(price);
      runHigh.push(Math.max(runHigh[i - 1], price));
      runLow.push(Math.min(runLow[i - 1], price));
    }

    return { open, close: price, ticks, runHigh, runLow };
  };
}

/* ------------------------------------------------------------------- props */

type TradingCandlestickIconProps = {
  className?: string;
  width?: number;
  height?: number;
  size?: number;
  /** Bars filling the viewport. */
  visibleCandles?: number;
  /** Horizontal dashed line tracking the live price, like a chart's last-price marker. */
  showPriceLine?: boolean;
  seed?: number;
};

export function TradingCandlestickIcon({
  className,
  width,
  height,
  size = 14,
  visibleCandles = DEFAULT_VISIBLE_BARS,
  showPriceLine = true,
  seed = 20240816,
}: TradingCandlestickIconProps) {
  const reactId = useId().replace(/:/g, "");
  const maskId = `tc-${reactId}-fade`;
  const gradientId = `tc-${reactId}-fade-grad`;

  const visible = Math.max(1, Math.round(visibleCandles));
  /** One spare off-screen left, one entering right. */
  const slots = visible + 2;

  const renderedWidth = width ?? size;
  const renderedHeight = height ?? size;

  /* Bar density is fixed by count; the height follows the element's real aspect
     ratio so nothing is ever stretched — bodies stay rectangular and wicks stay
     hairlines. The props only seed the first paint; a ResizeObserver keeps the
     viewBox matched to the box CSS actually gives us. */
  const viewWidth = visible * PITCH;
  const initialViewHeight = (viewWidth * renderedHeight) / renderedWidth;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewHeightRef = useRef(initialViewHeight);
  const bodyRefs = useRef<(SVGRectElement | null)[]>([]);
  const wickRefs = useRef<(SVGLineElement | null)[]>([]);
  const priceLineRef = useRef<SVGLineElement | null>(null);

  const slotIndexes = useMemo(
    () => Array.from({ length: slots }, (_, i) => i),
    [slots],
  );

  useEffect(() => {
    const nextBar = createSeries(seed);
    /** `bars[0]` is bar number `firstIndex`; bars are generated on demand. */
    const bars: Bar[] = [];
    let firstIndex = 0;

    const barAt = (index: number) => {
      while (firstIndex + bars.length <= index) bars.push(nextBar());
      return bars[index - firstIndex];
    };

    /** Drop history that has scrolled off, never past the leftmost drawn bar. */
    const trimBefore = (index: number) => {
      while (firstIndex < index && bars.length > slots + 1) {
        bars.shift();
        firstIndex += 1;
      }
    };

    /* The strip opens mid-session, so the timeline starts a full window in. */
    const startCursor = slots - 1;

    let domainLow = Number.NaN;
    let domainHigh = Number.NaN;

    const draw = (elapsedMs: number, frameMs: number) => {
      const cursor = startCursor + elapsedMs / BAR_MS;
      const liveIndex = Math.floor(cursor);
      const barProgress = cursor - liveIndex;

      const first = liveIndex - slots + 1;
      trimBefore(first);

      const state: {
        x: number;
        open: number;
        price: number;
        high: number;
        low: number;
      }[] = [];

      let targetLow = Infinity;
      let targetHigh = -Infinity;

      for (let s = 0; s < slots; s += 1) {
        const index = first + s;
        const bar = barAt(index);
        const live = index === liveIndex;
        /* Discrete prints: the price jumps between ticks the way a feed does. */
        const tick = live
          ? Math.min(TICKS_PER_BAR, Math.floor(barProgress * TICKS_PER_BAR))
          : TICKS_PER_BAR;

        const entry = {
          x: viewWidth - PITCH / 2 - (cursor - index) * PITCH,
          open: bar.open,
          price: bar.ticks[tick],
          high: bar.runHigh[tick],
          low: bar.runLow[tick],
        };
        state.push(entry);

        /* Scale to what is currently known, never to the bar's future extremes. */
        if (entry.x > -PITCH && entry.x < viewWidth + PITCH) {
          if (entry.low < targetLow) targetLow = entry.low;
          if (entry.high > targetHigh) targetHigh = entry.high;
        }
      }

      if (targetHigh - targetLow < 0.5) {
        const mid = (targetHigh + targetLow) / 2;
        targetLow = mid - 0.25;
        targetHigh = mid + 0.25;
      }

      /* Ease the axis toward the new range — a chart rescales, it doesn't snap. */
      if (Number.isNaN(domainLow)) {
        domainLow = targetLow;
        domainHigh = targetHigh;
      } else {
        const k = 1 - Math.exp(-frameMs / SCALE_TAU_MS);
        domainLow += (targetLow - domainLow) * k;
        domainHigh += (targetHigh - domainHigh) * k;
      }

      const viewHeight = viewHeightRef.current;
      const padY = viewHeight * 0.12;
      const span = domainHigh - domainLow || 1;
      const plot = viewHeight - padY * 2;
      const y = (price: number) => padY + ((domainHigh - price) / span) * plot;

      for (let s = 0; s < slots; s += 1) {
        const { x, open, price, high, low } = state[s];
        const body = bodyRefs.current[s];
        const wick = wickRefs.current[s];
        if (!body || !wick) continue;

        const up = price >= open;
        const color = up ? UP_COLOR : DOWN_COLOR;
        const top = y(Math.max(open, price));
        const bottom = y(Math.min(open, price));
        /* A doji still has to render as a line, not vanish. */
        const bodyHeight = Math.max(bottom - top, WICK_WIDTH);

        wick.setAttribute("x1", `${x}`);
        wick.setAttribute("x2", `${x}`);
        wick.setAttribute("y1", `${y(high)}`);
        wick.setAttribute("y2", `${y(low)}`);
        if (wick.dataset.color !== color) {
          wick.setAttribute("stroke", color);
          wick.dataset.color = color;
        }

        body.setAttribute("x", `${x - BODY_WIDTH / 2}`);
        body.setAttribute("y", `${top}`);
        body.setAttribute("height", `${bodyHeight}`);
        if (body.dataset.color !== color) {
          body.setAttribute("fill", color);
          body.dataset.color = color;
        }
      }

      const priceLine = priceLineRef.current;
      if (priceLine) {
        const live = state[slots - 1];
        const lineY = `${y(live.price)}`;
        priceLine.setAttribute("y1", lineY);
        priceLine.setAttribute("y2", lineY);
      }
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let previous = 0;
    let elapsed = 0;

    const tick = (now: number) => {
      const frameMs = previous ? Math.min(now - previous, MAX_FRAME_MS) : 16;
      previous = now;
      elapsed += frameMs;
      draw(elapsed, frameMs);
      frame = requestAnimationFrame(tick);
    };

    /* A frame long enough to snap the axis straight to its target, so the chart
       never opens mid-rescale. */
    const settle = () => draw(elapsed, SCALE_TAU_MS * 20);

    const start = () => {
      /* Paint one correct frame synchronously. rAF never fires while the tab is
         backgrounded, so without this the chart can mount and stay blank. */
      settle();
      if (reduceMotion.matches) return;
      previous = 0;
      frame = requestAnimationFrame(tick);
    };

    const restart = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      start();
    };

    const svg = svgRef.current;
    const observer = new ResizeObserver(() => {
      /* Read from the element rather than the entry — `contentRect` on SVG roots
         is less consistent across engines than getBoundingClientRect. */
      const box = svg?.getBoundingClientRect();
      if (!svg || !box || box.width === 0 || box.height === 0) return;
      viewHeightRef.current = (viewWidth * box.height) / box.width;
      svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeightRef.current}`);
      /* Re-map to the new height now; the rAF loop would only catch up next frame. */
      settle();
    });
    if (svg) observer.observe(svg);

    start();
    reduceMotion.addEventListener("change", restart);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduceMotion.removeEventListener("change", restart);
    };
  }, [seed, slots, viewWidth]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className={cn("inline-block shrink-0", className)}
      width={renderedWidth}
      height={renderedHeight}
      viewBox={`0 0 ${viewWidth} ${initialViewHeight}`}
      fill="none"
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2={viewWidth}
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.14" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.34" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        {/* Tall enough to cover any viewBox height the ResizeObserver lands on. */}
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect
            x="0"
            y="-2000"
            width={viewWidth}
            height="4000"
            fill={`url(#${gradientId})`}
          />
        </mask>
      </defs>

      <g mask={`url(#${maskId})`}>
        {showPriceLine && (
          <line
            ref={priceLineRef}
            x1="0"
            x2={viewWidth}
            y1={initialViewHeight / 2}
            y2={initialViewHeight / 2}
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth={WICK_WIDTH * 0.8}
            strokeDasharray={`${PITCH * 0.2} ${PITCH * 0.25}`}
          />
        )}

        {slotIndexes.map((s) => (
          <g key={s}>
            {/* One high→low line with the body drawn over it — how charts render a bar. */}
            <line
              ref={(node) => {
                wickRefs.current[s] = node;
              }}
              x1="0"
              x2="0"
              y1={initialViewHeight / 2}
              y2={initialViewHeight / 2}
              stroke={UP_COLOR}
              strokeWidth={WICK_WIDTH}
            />
            <rect
              ref={(node) => {
                bodyRefs.current[s] = node;
              }}
              x="0"
              y={initialViewHeight / 2}
              width={BODY_WIDTH}
              height={WICK_WIDTH}
              rx={WICK_WIDTH * 0.5}
              fill={UP_COLOR}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
