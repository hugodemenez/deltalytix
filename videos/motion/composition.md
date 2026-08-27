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

- Bezier scale `0.86 → 1` over 12 frames (`output: "perceptual-scale"`).
- Wordmark opacity 4→12.
- **No spring.** Springs overshoot and fight the 8-frame cut.

### Headline (short)

- Line 1: opacity 0→8, translate 36px→0 over 10 frames, bezier.
- Line 2: starts at frame 4, same recipe.
- Subhead: opacity 12→22.
- Keep Inter 300 / `-0.06em` / Paper canvas `#F7F7F4`.

### Product (long)

- **No scale, translate, or opacity on the sage well.** Those transforms jitter SVG ticks.
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
