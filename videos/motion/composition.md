# Composition and timing

All durations live in `videos/src/promo/timing.ts`. `videos/src/Root.tsx` and `Promo.tsx` must import those constants — do not hardcode frame counts in two places.

FPS is **30**. Transitions are `fade()` with `linearTiming({ durationInFrames: CUT_FRAMES })` where `CUT_FRAMES = 8`. No slide, no zoom.

`TransitionSeries` overlaps the next scene by `CUT_FRAMES`, so:

```
start(n+1) = start(n) + duration(n) - CUT_FRAMES
```

## Frame table (ads `Promo`)

| Scene | Duration | Absolute start | Notes |
| --- | ---: | ---: | --- |
| LogoReveal | 24 | 0 | Opacity + rise, no scale |
| Headline | 42 | 16 | Word stagger, no Ken Burns |
| StatsFeature | 66 | 50 | Count-up, unframed on canvas |
| DashboardScroll | 483 | 108 | Overview draw, then page scrolls |
| CallToAction | 36 | 583 | Action button on canvas |

Total `PROMO_DURATION_FRAMES` = 619 (~20.6s).

## Frame table (landing `PromoLandingLight` / `PromoLandingDark`)

Logo and headline are omitted — that copy is already on the landing page.

| Scene | Duration | Absolute start | Notes |
| --- | ---: | ---: | --- |
| StatsFeature | 66 | 0 | Same stats slam |
| DashboardScroll | 483 | 58 | Same camera |
| CallToAction | 36 | 533 | Action button |

Total `LANDING_DURATION_FRAMES` = 569 (~19.0s).

### Dashboard camera (relative to DashboardScroll)

Pixel-rounded `translateY` with `Easing.inOut(Easing.cubic)`. No scale. Each page is `DASH_PAGE_PX` (1080). Scrolls last **45 frames** so the pan reads on camera.

| Beat | Local frame | Scroll Y | What plays |
| --- | ---: | ---: | --- |
| Overview hold | 0–78 | 0 | Calendar cascade, equity clip, P&L bars |
| Scroll to chat | 78–123 | 0→1080 | Cubic in-out pan |
| Chat hold | 123–231 | 1080 | Compose → stream (starts as the pan begins) |
| Scroll to accounts | 231–276 | 1080→2160 | Cubic in-out pan |
| Accounts hold | 276–348 | 2160 | Three AccountCards |
| Scroll to connections | 348–393 | 2160→3240 | Cubic in-out pan |
| Connections hold | 393–483 | 3240 | Six services + file chips |

## In/out recipes

### Logo / headline / CTA

- Opacity + translate only. **No scale.**
- Dark canvas `#0F0F0F`. Light canvas `#F5F5F5`. No mesh, no grain.

### Stats

Shared chrome: caption on the canvas, numbers in the remaining stage. **No outer well.** Count through ~1.2s.

### Dashboard

One long page, camera pans down. Widgets **animate as their page enters** (`startFrame` / `delay` = that page's land frame). Overview charts draw on arrival; they are not a prior solo scene.

- **Overview** — hairline tiles. Calendar delay 4, equity delay 8 / draw 42, P&L delay 12.
- **Chat** — landing `chat-feature.tsx` chrome. Stages relative to `DASH_CHAT_AT`.
- **Prop firm** — `account-card.tsx` × Apex 50K / TopStep 50K / Earn2Trade TCP50.
- **Connections** — page chrome + every `SERVICE_SECTIONS` row + file-import chips.

Round `scrollY` to whole pixels so chart axes stay crisp while the page translates.

## If you change length

1. Edit `timing.ts` only (`DASH_*` holds and `DASH_SCROLL_FRAMES`).
2. Recompute `PROMO_DURATION_FRAMES` and `LANDING_DURATION_FRAMES` (already derived).
3. Confirm SFX `Sequence from={}` values still use the `*_START` / `DASH_SCROLL_TO_*` constants.
