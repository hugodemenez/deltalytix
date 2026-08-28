# Composition and timing

All durations live in `videos/src/promo/timing.ts`. `videos/src/Root.tsx` and `Promo.tsx` must import those constants — do not hardcode frame counts in two places.

FPS is **30**. Transitions are `fade()` with `linearTiming({ durationInFrames: CUT_FRAMES })` where `CUT_FRAMES = 8`. No slide, no zoom.

`TransitionSeries` overlaps the next scene by `CUT_FRAMES`, so:

```
start(n+1) = start(n) + duration(n) - CUT_FRAMES
```

## Frame table (current)

| Scene | Duration | Absolute start | Notes |
| --- | ---: | ---: | --- |
| LogoReveal | 24 | 0 | Opacity + rise, no scale |
| Headline | 42 | 16 | Word stagger, no Ken Burns |
| StatsFeature | 66 | 50 | Count-up, unframed on canvas |
| CalendarFeature | 72 | 108 | Cells cascade, unframed |
| EquityFeature | 72 | 172 | Series clip 4→46 |
| PnlFeature | 66 | 236 | Bars stagger 3 |
| ProductWell | 84 | 294 | Hairline tiles, already filled |
| CallToAction | 36 | 370 | White button on dark |

Total `PROMO_DURATION_FRAMES` = 406 (~13.5s).

## In/out recipes

### Logo / headline / CTA

- Opacity + translate only. **No scale.**
- Dark canvas `#0F0F0F`. No mesh, no grain.

### Feature scenes (short)

Shared chrome: caption on the canvas, widget in the remaining stage. **No outer well.**

- **Stats** — three numbers, no cards. Count through ~1.2s.
- **Calendar** — `framed={false}`, week stagger 2, day stagger 0.6.
- **Equity** — `framed={false}`, `EQUITY_DRAW_FRAMES` 42.
- **Daily P&L** — `framed={false}`, bar stagger 3.

### Together

Same layout, widgets use a 1px `#3A3A3A` hairline (dashboard card). Charts already filled.

## If you change length

1. Edit `timing.ts` only.
2. Recompute `PROMO_DURATION_FRAMES` (already derived).
3. Confirm SFX `Sequence from={}` values still use the `*_START` constants.
