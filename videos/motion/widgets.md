# Widgets and mock data

The product tour is **feature-scoped but short**: stats, calendar, equity, and daily P&L each glance on the dark canvas, then a hairline dashboard. Do not import Next.js, `useI18n`, Recharts, or Tailwind into `videos/`.

## Sources of truth

| Widget | Landing file | Promo files | Data |
| --- | --- | --- | --- |
| Statistics strip | First-test `Metrics` cards (count-up + sparkline) | `widgets/StatWidget.tsx`, `StatWidgets.tsx` | Net P&L `$3,860` (`MONTHLY_PNL`), win rate `64%`, `42` trades |
| Daily calendar | `app/[locale]/(landing)/components/calendar-preview.tsx` `buildDemoCalendarData()` | `widgets/mock-data.ts`, `calendar-grid.ts`, `CalendarWidget.tsx` | Day/pnl/trades for the pinned month |
| Equity | `performance-visualization-chart.tsx` `equityData` | `mock-data.ts` `equityData`, `EquityChart.tsx` | 24820 → 28140 |
| Daily P&L | same file `dailyPnlData` | `mock-data.ts` `dailyPnlData`, `DailyPnlChart.tsx` | 10 bars, win/loss colors |
| Chrome | Dashboard `.dark` canvas `#0F0F0F` | `tokens.ts`, `FeatureChrome.tsx`, `ChartFrame.tsx` | No nested wells. Feature scenes `framed={false}`; together uses hairline `#3A3A3A` |

Month is **pinned to August 2026** (`PROMO_YEAR` / `PROMO_MONTH` / `PROMO_TODAY_DAY = 27`) so renders stay deterministic. Do not use `new Date()` for the grid.

Chart colors match dashboard **dark** CSS variables:

- canvas `oklch(0.17 0 0)` → `#0F0F0F`
- win `hsl(173 60% 55%)` → `#47D1C1`
- loss `hsl(12 75% 65%)` → `#E87862`

Calendar cells use dark green/red washes (`rgba(..., 0.12)`), matching `dark:bg-green-900/20` / red-900/20.

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

If axes crawl again, search for `scale`, `spring`, or interpolate on a parent of `EquityAxes` / `DailyPnlAxes`. Feature chrome must not scale.

## Titles

Use the landing-preview strings: **"Equity Chart"** and **"P&L Chart"** (`locales/en/landing-preview.ts` `performanceCharts.equity` / `dailyPnl`).
