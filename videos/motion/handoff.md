# Handoff

## What this promo is

A 1920×1080, 30fps dashboard spot.

- **Ads** (`Promo`): dark, logo → headline → stats slam → scrolling dashboard → Get Started. ~20.6s.
- **Landing** (`PromoLandingLight` / `PromoLandingDark`): skips logo + headline (already on the page). Light is the default hero; dark follows the theme toggle. ~19.0s.

Tokens from `.dark` / `.light` + `CANVAS_THEME_COLOR`. Isolated app in `videos/` (Bun, Remotion 4.0.518). Studio: `cd videos && bun run dev` → http://localhost:3333

PRs still target **`beta`**, not `main`.

## Done

- Official Remotion skills restored with `bun run skills:install` (from `skills-lock.json` into `.agents/skills/remotion-*`).
- Ads composition with `TransitionSeries` **fades** (no slide, no zoom). Landing cut starts at stats.
- Light and dark token sets; landing hero uses `public/videos/demo_white.mp4` / `demo_dark.mp4`.
- Widgets driven by landing / dashboard copy and mock data, August 2026 pinned.
- Feature scenes unframed on one canvas; the dashboard is one scrolling page (pixel-rounded `translateY`, no zoom).
- Static memoized chart axes; series-only animation. Overview charts draw as the dashboard lands.
- AI chat, prop-firm `AccountCard`, and Connections play as later dashboard pages enter.
- Local Remotion WAV + Kenney OGG SFX.

## Commands

```bash
export PATH="$HOME/.bun/bin:$PATH"
cd videos
bun install
bun run lint
bun run dev          # Studio :3333
bunx remotion still PromoLandingLight out/landing-light-preview.png --frame=120 \
  --browser-executable=/usr/bin/google-chrome-stable --gl=angle
bunx remotion render PromoLandingLight out/promo-landing-light.mp4 \
  --browser-executable=/usr/bin/google-chrome-stable --gl=angle
bunx remotion render PromoLandingDark out/promo-landing-dark.mp4 \
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

Stills at a feature mid-draw can look empty while bars are still growing — that is intended. Check dashboard overview after ~50 local frames, chat after `DASH_CHAT_AT + 80`, accounts after `DASH_PROP_AT + 40`, connections after `DASH_CONN_AT + 50`, and the last 1s for the CTA.
