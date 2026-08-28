# Handoff

## What this promo is

A 1920×1080, 30fps dark dashboard spot: logo → headline → short feature glances (stats, calendar, equity, daily P&L, AI chat, prop-firm accounts, connections) → assembled dashboard → Get Started. ~21.7s. Tokens from `.dark` + `CANVAS_THEME_COLOR.dark` (`#0F0F0F`). Isolated app in `videos/` (Bun, Remotion 4.0.518). Studio: `cd videos && bun run dev` → http://localhost:3333

PRs still target **`beta`**, not `main`.

## Done

- Official Remotion skills vendored under `agents/skills/remotion-*`.
- Promo composition with `TransitionSeries` **fades** (no slide, no zoom).
- Widgets driven by landing / dashboard copy and mock data, August 2026 pinned.
- Feature scenes unframed on one canvas; together beat uses hairline tiles.
- Static memoized chart axes; series-only animation.
- AI chat, prop-firm `AccountCard`, and Connections page rebuilt from product UI (not invented chrome).
- Local Remotion WAV + Kenney OGG SFX.

## Commands

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd videos
bun install
bun run lint
bun run dev          # Studio :3333
bunx remotion still Promo out/promo-preview.png --frame=80 \
  --browser-executable=/usr/bin/google-chrome-stable --gl=angle
bunx remotion render Promo out/promo.mp4 \
  --browser-executable=/usr/bin/google-chrome-stable --gl=angle
```

Output is gitignored (`videos/out/`).

## Next ideas (not started)

- Music bed under the whooshes (keep SFX quiet).
- Extra feature beats for weekday P&L or trade distribution from the same landing file.
- EN/FR caption pass (`remotion-captions` skill).

## Files to touch first

| Change | File |
| --- | --- |
| Scene lengths | `videos/src/promo/timing.ts` |
| Copy | `scenes/Headline.tsx`, `scenes/CallToAction.tsx`, `widgets/product-copy.ts` |
| Widget data | `widgets/mock-data.ts` (keep in sync with landing) |
| Chat / accounts / connections | `widgets/ChatWidget.tsx`, `PropFirmCard.tsx`, `ConnectionsWidget.tsx` |
| Stat cards | `widgets/StatWidget.tsx`, `StatWidgets.tsx` |
| Axis math | `widgets/chart-geometry.tsx` |
| SFX | `PromoSfx.tsx` + `sfx.ts` |
| Tokens | `tokens.ts` |

## Review the picture, not just Studio

Stills at a feature mid-draw can look empty while bars are still growing — that is intended. Check a still after each widget’s draw window, chat after the stream (~frame 380), the three prop cards (~410), all six connection rows (~500), the assembled dashboard (~together start + 20), and the last 1s for the CTA.
