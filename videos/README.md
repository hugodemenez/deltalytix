# Deltalytix promo videos

Remotion project for product promo compositions. Tokens follow the landing page and the **Deltalytix — Email Design System** Paper file.

**Agent motion spec:** [`motion/AGENTS.md`](./motion/AGENTS.md)

## Commands

```bash
cd videos
bun install
bun run dev          # Studio at http://localhost:3333
bun run still        # one-frame preview
bun run render       # 1920×1080 H.264 of the Promo composition
```

## Composition

`Promo` is a 10.4s (312 frames @ 30fps) landing-style spot:

1. Short logo snap
2. Short headline (landing copy, 300 weight, -0.06em tracking)
3. Long product well — landing calendar + equity / daily P&L (slow series draw, static axes)
4. Short Get Started CTA

## Sound

Local cues only (`public/sfx/remotion/`). See [`motion/sound.md`](./motion/sound.md).
