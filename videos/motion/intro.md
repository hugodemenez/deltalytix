# Intro motion craft

How the logo and headline scenes should move. Widget/chart rules still live in [widgets.md](./widgets.md).

## Rules

1. Dark canvas `#0F0F0F` (`CANVAS_THEME_COLOR.dark`) for ads. Light canvas `#F5F5F5` (`CANVAS_THEME_COLOR.light`) for the landing cut. Flat — no sage mesh, no grain, no nested wells.
2. Entrances are opacity + translate. **Never scale or Ken Burns.** Zoom fights chart-axis stability and reads as a different video genre.
3. Headline words stagger by 3–4 frames. Highlight **one** word (`every`) with `tokens.positive` as a fade-in wash, not a scale.
4. Copy lands fast. Do not sit on the headline.
5. All colors come from `videos/src/promo/tokens.ts`.

## Files

- `videos/src/promo/layers/WordReveal.tsx`
- `videos/src/promo/scenes/LogoReveal.tsx`
- `videos/src/promo/scenes/Headline.tsx`
- `videos/src/promo/scenes/CallToAction.tsx`
