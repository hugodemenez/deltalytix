# Composition and timing

All durations live in `videos/src/promo/timing.ts`. `videos/src/Root.tsx` and `Promo.tsx` must import those constants — do not hardcode frame counts in two places.

FPS is **30**. Transitions are `slide({ direction: "from-bottom" })` with `linearTiming({ durationInFrames: SLIDE_FRAMES })` where `SLIDE_FRAMES = 8`.

`TransitionSeries` overlaps the next scene by `SLIDE_FRAMES`, so:

```
start(n+1) = start(n) + duration(n) - SLIDE_FRAMES
```

## Frame table (current)

| Scene | Duration | Absolute start | Absolute end (exclusive) | Notes |
| --- | ---: | ---: | ---: | --- |
| LogoReveal | 30 | 0 | 30 | Short sting |
| Headline | 54 | 22 | 76 | Word stagger + highlight |
| StatsFeature | 150 | 68 | 218 | Count-up through ~frame 78, then hold |
| CalendarFeature | 180 | 210 | 390 | Cells cascade, then readable hold |
| EquityFeature | 180 | 382 | 562 | Series clip 8→116 |
| PnlFeature | 150 | 554 | 704 | Bars stagger, last bar ~frame 106 |
| ProductWell | 96 | 696 | 792 | All widgets together, fast fill |
| CallToAction | 42 | 784 | 826 | Button beat |

Total `PROMO_DURATION_FRAMES` = 826 (27.5s).

## In/out recipes

### Logo (short)

- Bezier 3-property entrance: opacity 0→8, translate 28px→0 over 12, scale 0.88→1 over 12 (`output: "perceptual-scale"`), then a slow push to 1.05.
- Sage `PaperMesh` + light `FilmGrain`. **No spring.**

### Headline (short)

- Word-by-word reveal, 4-frame stagger, opacity + translate.
- Highlight **every** with a Paper-positive block.
- Slow push on the type stack. Mesh + grain continue.

### Feature scenes (long, one widget each)

Shared chrome: sage page, `#ddddd8` well, eyebrow + title, **no scale/translate on the well**.

- **Stats** — three large cards. Count bezier through ~2.5s, then hold.
- **Calendar** — full stage. Week stagger 5, day stagger 1.5.
- **Equity** — `EQUITY_DELAY_FRAMES` (8) then `EQUITY_DRAW_FRAMES` (108). Axes static.
- **Daily P&L** — bars grow with `PNL_BAR_STAGGER_FRAMES` (6). Axes static.

### Together (short)

Same layout as the old single product scene. Charts use a fast fill (`drawFrames={20}`, bar stagger 2) so the assembled dashboard is readable for the hold.

### CTA (short)

- Bezier scale `0.94 → 1` over 10 frames.
- Mesh + grain. Button is Paper action `#181A18`.

## If you change length

1. Edit `timing.ts` only.
2. Recompute `PROMO_DURATION_FRAMES` (already derived).
3. Confirm SFX `Sequence from={}` values still use the `*_START` constants.
4. Re-render `Promo` and still each feature near mid-draw **and** after the hold.
