# Promo motion — agent handoff

This directory is the motion spec for the Deltalytix Remotion promo in `videos/`.
Read it before changing timing, widgets, or sound.

| Doc | Use it for |
| --- | --- |
| [composition.md](./composition.md) | Scene graph, frame table, in/out recipes |
| [intro.md](./intro.md) | Logo/headline motion (no zoom, dark canvas) |
| [widgets.md](./widgets.md) | Landing mock data, chart axis rules, calendar pin |
| [sound.md](./sound.md) | SFX libraries, cue map, sync rules |
| [handoff.md](./handoff.md) | Commands, done vs next, PR notes |

## Non-negotiables

1. **Axes never interpolate.** Grid lines and tick labels are a memoized static SVG. Only the series (equity clip, bar heights) may move.
2. **Do not scale a parent of charts.** No Ken Burns, no spring-scale, no CSS `scale` on the stage.
3. **One dark surface.** Canvas and cards share `#0F0F0F`. Do not nest sage / gray / white wells. Feature scenes are unframed; the together beat uses hairline tiles.
4. **Text scenes are short; the dashboard is one scrolling page.** Stats is a glance. Calendar / equity / P&L are not solo scenes — they draw together on the first dashboard viewport, then chat, accounts, and connections animate as the camera translates down.
5. **One local SFX per cut or page turn.** Use `staticFile()` copies in `videos/public/sfx/remotion/` (and Kenney OGGs for chat / accounts / connections).
6. **Widgets copy landing and dashboard UI**, not invented chrome or numbers. Chat, prop-firm cards, and connections must match product copy, logos, and account-size rules.

## Stack

- Remotion 4.0.518, Bun, Studio on port **3333**
- Composition `Promo` in `videos/src/promo/Promo.tsx`
- Tokens in `videos/src/promo/tokens.ts` (dashboard `.dark` + `CANVAS_THEME_COLOR.dark`)
- Timing constants in `videos/src/promo/timing.ts` — Root, Promo, and SFX all import from here
