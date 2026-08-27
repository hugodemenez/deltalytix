# Intro motion craft

How the logo and headline scenes should move. Widget/chart rules still live in [widgets.md](./widgets.md) — do not put mesh, grain, or scale on the product well.

## Sources (read these, do not fork them into `videos/`)

| Source | What to take | What to leave |
| --- | --- | --- |
| Official [`remotion-dev/skills`](https://github.com/remotion-dev/skills) (`remotion-markup`, `video-layout.md`, `timing.md`, `text-highlights.md`, `light-leaks.md`) | `useCurrentFrame` + `interpolate`, bezier, clamp, Interactive transform shorthands, 84px+ headlines, safe area | CSS transitions, `transform` strings |
| [`haidrrrry/claude-remotion-skill`](https://github.com/haidrrrry/claude-remotion-skill) (MIT) | 2–3 property entrances, word stagger, highlight one word, Ken Burns / slow push, drifting mesh, light grain, SFX 2–3 frames before a hit | Dark 5-layer grade, spring-on-everything, display fonts 600–800, grain over charts, magic `theme.ts` that fights Paper |
| [Tim Kochjar / Tables.so demo](https://x.com/timkochjar/status/2092278549679886507) | Off-white canvas, silk mesh wipe, word-staggered type, highlight block behind one word, continuous micro-zoom, staggered UI chips | Their blue brand, 95s runtime, 3D curtain, odometer shots |

Official Remotion still wins on API: **prefer `interpolate` + bezier over `spring()`** unless a hit needs physics. Spring-scale on a parent of chart axes is forbidden.

## Rules for Deltalytix intro scenes

1. Something moves in the first 8 frames (logo opacity + rise + scale together).
2. Entrances animate at least two of opacity / translate / scale. A lone fade is not an entrance.
3. Headline words stagger by 3–5 frames. Highlight **one** word (`every`) with Paper positive, not a second ink color.
4. Idle type gets a slow push (`scale` 1 → ~1.03, `transformOrigin: left top`). Do not apply this to the product well.
5. Background is Paper canvas `#F7F7F4` plus a drifting sage/positive mesh. Never a flat solid on logo/headline/CTA.
6. Grain stays at ~3.5% multiply, intro/CTA only.
7. Holds exist: after the last word lands, let the line sit before the product cut.
8. All colors come from `videos/src/promo/tokens.ts`.

## Files

- `videos/src/promo/layers/PaperMesh.tsx`
- `videos/src/promo/layers/FilmGrain.tsx`
- `videos/src/promo/layers/WordReveal.tsx`
- `videos/src/promo/scenes/LogoReveal.tsx`
- `videos/src/promo/scenes/Headline.tsx`
