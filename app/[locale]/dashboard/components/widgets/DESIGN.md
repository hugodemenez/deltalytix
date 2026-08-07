# Dashboard widget design system

Derived from the Vercel/Geist brand design guidance (`https://vercel.com/design.md`),
translated into the primitives that exist in this repository (Tailwind + shadcn +
Recharts). Read this before touching any widget.

## The one rule

> Design in monochrome. Use color only when it adds significant meaning to state,
> action, or data.

In a trading dashboard "significant meaning" is a short list:

| Meaning                     | Token                                    |
| --------------------------- | ---------------------------------------- |
| Positive / winning P&L      | `hsl(var(--chart-win))` / `text-success`  |
| Negative / losing P&L       | `hsl(var(--chart-loss))` / `text-destructive` |
| Breakeven / neutral         | `hsl(var(--muted-foreground))`            |
| Active selection / filter   | `hsl(var(--primary))`                     |
| Categorical series (3+)     | `--chart-1` … `--chart-8`, in order       |

Everything else — magnitude bars, distributions, timelines, axis furniture — is
`foreground` / `muted-foreground` / `border`. Never hardcode `text-green-500`,
`text-red-500`, `#22c55e`, or any raw hex. Use the tokens.

## Typography roles

Do not invent sizes. Every widget uses exactly these roles, exposed as helpers in
`widget-shell.tsx` and `widget-type.ts`:

| Role       | Class                                              | Use                                     |
| ---------- | -------------------------------------------------- | --------------------------------------- |
| `title`    | `text-sm font-medium leading-none tracking-tight`   | Widget title in the header              |
| `metric`   | `text-2xl font-semibold tabular-nums tracking-tight`| The one focal number of a KPI widget    |
| `value`    | `text-sm font-medium tabular-nums`                  | Values in label/value rows              |
| `label`    | `text-xs text-muted-foreground`                     | Names in label/value rows, axis titles  |
| `caption`  | `text-xs text-muted-foreground`                     | Units, periods, qualifiers under a value|
| `mono`     | `font-mono text-xs`                                 | **Only** ids, symbols, paths, timestamps|

**Financial figures are Sans + `tabular-nums`, never `font-mono`.** Mono is for
operational identifiers (account ids, instrument tickers when used as codes,
timestamps), not for money. This is the single most common violation in the old
widgets.

Hard rejects, verbatim from the guidance:

- All-caps eyebrows and tracked labels (`uppercase tracking-wider` on a label).
- Em dashes in interface copy.
- Badges/pills for ordinary metadata.
- Nested cards, or borders used to repair weak hierarchy.
- Colored tiles around icons; oversized decorative icons.
- Decorative gradients, glows, blobs, glass effects.
- Repeated metric boxes with identical silhouettes across unrelated questions.

## Structure and spacing

A widget is **one** card. Inside it there are no more cards.

```
WidgetCard            border, radius, bg-card — the only border you get for free
  WidgetHeader        title + info + actions, separated by a single border-b
  WidgetBody          the evidence
  WidgetFooter        optional: units, period, source qualifier
```

Spacing expresses relationship, not a universal stack rule:

- label → its value: no gap (they sit on one row, value right-aligned)
- row → sibling row: `gap-1.5`
- group → next group: `gap-4`
- header → body: the `border-b`, plus body padding

Padding scales with `WidgetSize` via `widgetPadding(size)`. Do not hand-roll
`size === 'small' ? 'p-2' : 'p-4'` ternaries in each widget again.

## Numbers and alignment

- Numeric cells and values are **right-aligned**; their labels are left-aligned.
- Every number that can change width gets `tabular-nums`.
- Peer values across a widget share precision. Pick it once, in the formatter.
- State the unit and the period near the evidence, in `caption`, not in a tooltip
  only.

Use `formatCurrency`, `formatPercent`, `formatCount`, `formatDuration` and
`formatCompactCurrency` from `widget-format.ts`. They are locale-aware and give
consistent precision. Do not call `toFixed(2)` inline.

## Charts

- Zero baseline on every length encoding (bars, areas). If a range or delta
  answers the question better, chart the delta explicitly, on a stated basis.
- Direct labels beat legends. Drop the legend when there are ≤ 2 series.
- Axis furniture is quiet: no axis line, no tick line, `border` colored grid,
  `muted-foreground` ticks at `11px` (`10px` at small sizes).
- Grid: horizontal only for magnitude charts. Vertical grid lines are noise.
- Tooltips use `WidgetTooltip` from `chart-primitives.tsx`. Sentence-case labels,
  right-aligned values, tabular numbers. No uppercase eyebrows.
- Do not exaggerate small differences with a cropped baseline, and do not bury
  them in near-identical totals. Show the delta.
- A chart must stay legible in both themes. Read colors from CSS variables so the
  theme swap is automatic; never branch on a `darkMode` boolean read from a
  `MutationObserver`.

## Motion

Default to stillness.

- Motion only communicates a state change, maintains continuity, or confirms an
  action. Duration `150ms`, `ease-out`.
- No entry animations on data that was already there, no pulsing, no simulated
  typing, no auto-scrolling.
- Everything animated must be inert under `prefers-reduced-motion: reduce`. Use
  the `motion-safe:` variant rather than a bare `transition-*`.

## Accessibility

- The widget title is a real heading (`WidgetTitle` renders `<h3>`).
- Interactive widgets (click-to-filter charts) need a real `<button>` or
  `role="button"` + `tabIndex={0}` + key handlers, a visible `focus-visible` ring,
  and an accessible name that states the effect.
- Never encode meaning with color alone: pair win/loss color with a sign, an
  arrow, or a label.
- Chart data that is material gets a semantic table alternative or, at minimum,
  an `aria-label` summarizing the takeaway.
- Contrast meets WCAG AA in both themes.

## Empty, loading, error

Three states, one shape each, from `widget-states.tsx`:

- `WidgetEmpty` — one line saying what would appear here and what to do. No
  illustration, no card inside the card.
- `WidgetSkeleton` — matches the final layout's geometry so nothing jumps.
- `WidgetError` — states what failed in one sentence, offers retry if it exists.

## Checklist before you call a widget done

1. Squint at it: is the dominant claim obvious, and is the reading path stable?
2. Would removing any border, tile, or color change what the reader understands?
   If no, remove it.
3. Are all peer values aligned on the same right edge with the same precision?
4. Does it work at every `allowedSizes` entry in the widget registry?
5. Light and dark, without a visible theme switcher?
6. Keyboard reachable, focus visible, no color-only meaning?
7. `bun run typecheck` and `bun run lint` clean.
