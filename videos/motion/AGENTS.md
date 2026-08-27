# Promo motion — agent handoff

This directory is the motion spec for the Deltalytix Remotion promo in `videos/`.
Read it before changing timing, widgets, or sound.

| Doc | Use it for |
| --- | --- |
| [composition.md](./composition.md) | Scene graph, frame table, in/out recipes |
| [intro.md](./intro.md) | Logo/headline motion craft (mesh, stagger, highlight) |
| [widgets.md](./widgets.md) | Landing mock data, chart axis rules, calendar pin |
| [sound.md](./sound.md) | SFX libraries, cue map, sync rules |
| [handoff.md](./handoff.md) | Commands, done vs next, PR notes |

## Non-negotiables

1. **Axes never interpolate.** Grid lines and tick labels are a memoized static SVG. Only the series (equity clip, bar heights) may move.
2. **Do not spring-scale a parent of charts.** CSS `scale` on the sage well is what made the axes crawl.
3. **Text scenes are short; the product scene is long.** Copy slams in under 0.5s. Charts draw over ~2.4s so the viewer can read them.
4. **One local SFX per cut.** Use `staticFile()` copies in `videos/public/sfx/remotion/`. Do not fetch `https://remotion.media/...` at render time — those cues land late.
5. **Widgets copy landing mock data**, not invented dashboard numbers. Sources: `app/[locale]/(landing)/components/calendar-preview.tsx` and `performance-visualization-chart.tsx`.

## Stack

- Remotion 4.0.518, Bun, Studio on port **3333**
- Composition `Promo` in `videos/src/promo/Promo.tsx`
- Tokens in `videos/src/promo/tokens.ts` (landing + Paper)
- Timing constants in `videos/src/promo/timing.ts` — Root, Promo, and SFX all import from here
