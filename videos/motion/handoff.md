# Handoff

## What this promo is

A 1920×1080, 30fps landing-style spot: logo → headline → stats strip + landing widgets (calendar + equity + daily P&L) → Get Started. Paper / landing tokens. Isolated app in `videos/` (Bun, Remotion 4.0.518). Studio: `cd videos && bun run dev` → http://localhost:3333

PRs still target **`beta`**, not `main`.

## Done

- Official Remotion skills vendored under `agents/skills/remotion-*` (symlinked into `.cursor/skills` and `.claude/skills`).
- Promo composition with `TransitionSeries` slides.
- Widgets driven by landing mock data, August 2026 pinned.
- Product scene stats strip (Net P&L, win rate, trades) counting from the same mock data.
- Static memoized chart axes; series-only animation.
- Local Remotion Media + Kenney SFX libraries; **playback** uses Remotion WAV whoosh/click only.
- Motion spec in this directory, including intro craft in `intro.md`.

## Commands

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd videos
bun install
bun run lint
bun run dev          # Studio :3333
bunx remotion still Promo out/promo-preview.png --frame=120 \
  --browser-executable=/usr/bin/google-chrome-stable --gl=angle
bunx remotion render Promo out/promo.mp4 \
  --browser-executable=/usr/bin/google-chrome-stable --gl=angle
```

Output is gitignored (`videos/out/`).

## Next ideas (not started)

- Music bed under the whooshes (keep SFX quiet).
- Second product beat (weekday P&L or trade distribution from the same landing file).
- EN/FR caption pass (`remotion-captions` skill).
- Dark-theme variant — only if Paper/landing has a locked dark set; do not invent one.

## Files to touch first

| Change | File |
| --- | --- |
| Scene lengths | `videos/src/promo/timing.ts` |
| Copy | `scenes/Headline.tsx`, `scenes/CallToAction.tsx` |
| Widget data | `widgets/mock-data.ts` (keep in sync with landing) |
| Stat cards | `widgets/StatWidget.tsx`, `StatWidgets.tsx` |
| Axis math | `widgets/chart-geometry.tsx` |
| SFX | `PromoSfx.tsx` + `sfx.ts` |
| Tokens | `tokens.ts` |

## Review the picture, not just Studio

Stills at product-start +16 can look empty while bars are still growing — that is intended now. Check a still near product-start +90 for the filled charts, and the last 1s for the CTA.
