# Widgets and mock data

The product scene is a Remotion port of landing preview widgets. Do not import Next.js, `useI18n`, Recharts, or Tailwind into `videos/`.

## Sources of truth

| Widget | Landing file | Promo files | Data |
| --- | --- | --- | --- |
| Statistics strip | First-test `Metrics` cards (count-up + sparkline) | `widgets/StatWidget.tsx`, `StatWidgets.tsx` | Net P&L `$3,860` (`MONTHLY_PNL`), win rate `64%`, `42` trades |
| Daily calendar | `app/[locale]/(landing)/components/calendar-preview.tsx` `buildDemoCalendarData()` | `widgets/mock-data.ts`, `calendar-grid.ts`, `CalendarWidget.tsx` | Day/pnl/trades for the pinned month |
| Equity | `performance-visualization-chart.tsx` `equityData` | `mock-data.ts` `equityData`, `EquityChart.tsx` | 24820 → 28140 |
| Daily P&L | same file `dailyPnlData` | `mock-data.ts` `dailyPnlData`, `DailyPnlChart.tsx` | 10 bars, win/loss colors |
| Chrome | `features.tsx` well `#ddddd8`, `ChartFrame` `rounded-md border bg-card` | `tokens.featureWell`, `ChartFrame.tsx` | Sage page `oklch(0.88 0.04 165)` |

Month is **pinned to August 2026** (`PROMO_YEAR` / `PROMO_MONTH` / `PROMO_TODAY_DAY = 27`) so renders stay deterministic. Do not use `new Date()` for the grid.

Chart colors match CSS variables:

- win `hsl(173 58% 39%)` → `#2A9D90`
- loss `hsl(12 76% 61%)` → `#E76E50`

Calendar cells use Tailwind green-50/600 and red-50/600, matching the landing preview.

## Axis stability (required)

Jitter happened when:

1. The feature well used `scale` + `Easing.spring` while SVG ticks painted.
2. Axes lived in the same SVG as an interpolating `clipPath` / growing bars, so the box shifted.

Rules:

- Geometry is computed **once** in `widgets/chart-geometry.tsx` (rounded pixel coordinates).
- `EquityAxes` and `DailyPnlAxes` are `memo()` components with **no** `useCurrentFrame`.
- Series sit in a **separate** full-size SVG on top. Equity reveal is CSS `clip-path: inset(0 N% 0 0)` on that overlay — the SVG itself never changes size.
- Bar heights `Math.round(...)`. Grid lines `shapeRendering="crispEdges"`.
- SVG `width`/`height` attributes equal the viewBox (`680×360`) with `preserveAspectRatio="xMidYMid meet"`.

If axes crawl again, search for `scale`, `spring`, or interpolate on a parent of `EquityAxes` / `DailyPnlAxes`. Stat cards may fade/translate; the feature well and chart columns must not.

## Titles

Use the landing-preview strings: **"Equity Chart"** and **"P&L Chart"** (`locales/en/landing-preview.ts` `performanceCharts.equity` / `dailyPnl`).
