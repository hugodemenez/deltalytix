# Composition and timing

All durations live in `videos/src/promo/timing.ts`. `videos/src/Root.tsx` and `Promo.tsx` must import those constants — do not hardcode frame counts in two places.

FPS is **30**. Transitions are `slide({ direction: "from-bottom" })` with `linearTiming({ durationInFrames: SLIDE_FRAMES })` where `SLIDE_FRAMES = 8`.

`TransitionSeries` overlaps the next scene by `SLIDE_FRAMES`, so:

```
start(n+1) = start(n) + duration(n) - SLIDE_FRAMES
```

## Frame table (current)

| Scene | Duration | Absolute start | Absolute end (exclusive) | On-screen hold after in-anim |
| --- | ---: | ---: | ---: | --- |
| LogoReveal | 30 | 0 | 30 | ~0.5s after the 12-frame scale |
| Headline | 54 | 22 | 76 | Copy in by frame 22 of the scene |
| ProductWell | 210 | 68 | 278 | Equity draw 12→84 of the scene; bars 24→~105 |
| CallToAction | 42 | 270 | 312 | Footnote in by frame 18 of the scene |

Total `PROMO_DURATION_FRAMES` = 312 (10.4s).

## In/out recipes

### Logo (short)

- Bezier 3-property entrance: opacity 0→8, translate 28px→0 over 12, scale 0.88→1 over 12 (`output: "perceptual-scale"`), then a slow push to 1.05.
- Wordmark opacity + translate 6→16.
- Sage `PaperMesh` + light `FilmGrain`. **No spring.**
- Ding SFX at frame 0.

### Headline (short)

- Word-by-word reveal, 4-frame stagger, opacity + translate.
- Highlight **every** with a Paper-positive block that scales in from the left.
- Subhead: opacity + translate 28→40.
- Slow push on the type stack (`transformOrigin: left top`). Mesh + grain continue.

### Product (long)

- **No scale, translate, or opacity on the sage well or chart columns.** Those transforms jitter SVG ticks.
- Stats strip (208px) counts Net P&L / win rate / trades with bezier, not spring. Sparkline is CSS `strokeDashoffset` on the P&L card only.
- Calendar is 1020×728 under the stats; equity and daily P&L stack at 756×356.
- Calendar fades 0→0.2s. Cells stagger by week/day but do not spring.
- Equity series clips left-to-right over `EQUITY_DRAW_FRAMES` (72) after `EQUITY_DELAY_FRAMES` (12).
- Daily bars grow over `PNL_BAR_DRAW_FRAMES` (36) with `PNL_BAR_STAGGER_FRAMES` (5), after `PNL_DELAY_FRAMES` (24).

### CTA (short)

- Bezier scale `0.94 → 1` over 10 frames.
- Footnote opacity 8→18.
- Button is Paper action `#181A18`, `borderRadius: 4`.

## If you change length

1. Edit `timing.ts` only.
2. Recompute `PROMO_DURATION_FRAMES` (already derived).
3. Confirm SFX `Sequence from={}` values still use `HEADLINE_START` / `PRODUCT_START` / `CTA_START`.
4. Re-render `Promo` and check stills at the first product frame (~start+16) **and** mid-draw (~start+50).
