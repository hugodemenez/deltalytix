# Deltalytix promo videos

Remotion project for product promo compositions. Tokens follow the landing page and the **Deltalytix — Email Design System** Paper file (`#F7F7F4` canvas, `#171917` / `#686D67` type, `#3E7550` positive, `#181A18` action, sage product well, `#ddddd8` feature chrome).

## Commands

```bash
cd videos
bun install
bun run dev          # Studio at http://localhost:3333
bun run still        # one-frame preview
bun run render       # 1920×1080 H.264 of the Promo composition
```

## Composition

`Promo` is a 10.8s (324 frames @ 30fps) landing-style spot:

1. Logo snap
2. Headline (landing copy, 300 weight, -0.06em tracking)
3. Product well with the landing calendar + equity / daily P&L widgets (same mock data as `calendar-preview.tsx` and `performance-visualization-chart.tsx`)
4. Get Started CTA

## Sound

Cues live in `public/sfx/`:

- `remotion/` — `@remotion/sfx` / remotion.media professional cuts (whoosh, page-turn, click, ding, …)
- `kenney/` — Kenney Interface Sounds (CC0), via [soundcn](https://github.com/kapishdima/soundcn/tree/main/assets/kenney_interface-sounds)
