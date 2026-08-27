# Deltalytix promo videos

Remotion project for product promo compositions. The canonical agent skills live in [`../agents/skills/remotion-best-practices`](../agents/skills/remotion-best-practices/SKILL.md).

## Commands

```bash
cd videos
bun install
bun run dev          # Studio at http://localhost:3333
bun run still        # one-frame preview
bun run render       # 1920×1080 H.264 of the Promo composition
```

## Composition

`Promo` is a 16.8s (504 frames @ 30fps) landing-style spot:

1. Logo reveal
2. Headline from the marketing site
3. Dashboard metrics (P&L, win rate, time in trade)
4. Get started CTA

Scene compositions are registered under the `Promo-Scenes` folder so they can be edited independently in Studio.
