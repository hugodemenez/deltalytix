# Sound

## Libraries

Vendored under `videos/public/sfx/` (offline renders):

| Folder | Library | License |
| --- | --- | --- |
| `remotion/` | Same files as `@remotion/sfx` / [remotion.media](https://remotion.media) | Remotion / media license |
| `kenney/` | Kenney Interface Sounds via [soundcn](https://github.com/kapishdima/soundcn/tree/main/assets/kenney_interface-sounds) | CC0 (see `kenney/License.txt`) |

`videos/src/promo/sfx.ts` maps `staticFile()` paths. Prefer those over `import { whoosh } from "@remotion/sfx"` — the package exports **remote URLs**, which start late and make cuts feel unsynced.

## Cue map (current)

One cue per visual cut or dashboard page turn, local files, **near full mix** (0.85–0.95).

| Absolute frame | Constant | File | Volume | Why |
| ---: | --- | --- | ---: | --- |
| `0` | ding | `sfx/remotion/ding.wav` | 0.55 | Logo sting |
| `HEADLINE_START` | page-turn | `sfx/remotion/page-turn.wav` | 0.90 | Slide into headline |
| `STATS_START` | whip | `sfx/remotion/whip.wav` | 0.85 | Stats feature |
| `DASHBOARD_START` | page-turn | `sfx/remotion/page-turn.wav` | 0.75 | Assembled dashboard |
| `DASHBOARD_START + DASH_SCROLL_TO_CHAT` | whoosh | `sfx/remotion/whoosh.wav` | 0.85 | Scroll to chat |
| `CHAT_START` | confirmation | `sfx/kenney/confirmation_002.ogg` | 0.85 | AI chat send |
| `DASHBOARD_START + DASH_SCROLL_TO_PROP` | whoosh | `sfx/remotion/whoosh.wav` | 0.85 | Scroll to accounts |
| `PROP_START` | open | `sfx/kenney/open_002.ogg` | 0.85 | Account cards |
| `DASHBOARD_START + DASH_SCROLL_TO_CONN` | switch | `sfx/remotion/switch.wav` | 0.85 | Scroll to connections |
| `CONNECTIONS_START` | select | `sfx/kenney/select_004.ogg` | 0.85 | Connections list |
| `CTA_START` | mouse click | `sfx/remotion/mouse-click.wav` | 0.95 | Button beat |

`PromoSfx` wraps each `Audio` in `Sequence from={...} durationInFrames={30}`. Keep that window ≥ 1s — `@remotion/media` needs decode time; 16–18 frame windows made cues inaudible.

Rendered peaks should land around −3 to −8 dB (`ffmpeg -af volumedetect`), not −15 dB.

## If the picture has “no sound”

1. Confirm `src` is `staticFile(...)`, not `https://remotion.media/...`.
2. Confirm volume is ≥ ~0.8. Quiet SFX + AAC + a web player reads as silence.
3. Confirm `durationInFrames` on the Sequence is ≥ 30.
4. `ffprobe` must show an AAC stereo stream. Then `volumedetect` `max_volume` should be louder than −12 dB.
5. Some in-app video players start muted — use the speaker control on the player.
