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

`Promo` is the ads cut (logo → headline → stats → dashboard → CTA). `PromoLandingLight` / `PromoLandingDark` skip logo and headline for the site hero.

## Sound

Local cues only (`public/sfx/remotion/`). See [`motion/sound.md`](./motion/sound.md).
