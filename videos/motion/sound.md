# Sound

## Libraries

Vendored under `videos/public/sfx/` (offline renders):

| Folder | Library | License |
| --- | --- | --- |
| `remotion/` | Same files as `@remotion/sfx` / [remotion.media](https://remotion.media) | Remotion / media license |
| `kenney/` | Kenney Interface Sounds via [soundcn](https://github.com/kapishdima/soundcn/tree/main/assets/kenney_interface-sounds) | CC0 (see `kenney/License.txt`) |

`videos/src/promo/sfx.ts` maps `staticFile()` paths. Prefer those over `import { whoosh } from "@remotion/sfx"` — the package exports **remote URLs**, which start late and make cuts feel unsynced.

## Cue map (current)

One cue per visual cut, local WAV, quiet.

| Absolute frame | Constant | File | Volume | Why |
| ---: | --- | --- | ---: | --- |
| `HEADLINE_START` (22) | whoosh | `sfx/remotion/whoosh.wav` | 0.22 | Slide into headline |
| `PRODUCT_START` (68) | whoosh | same | 0.20 | Slide into widgets |
| `CTA_START` (270) | mouse click | `sfx/remotion/mouse-click.wav` | 0.28 | Button beat |

No logo chime, no Kenney confirm/open/tick, no stacked page-turn on the CTA. Those read as game-UI and doubled the whoosh.

`PromoSfx` wraps each `Audio` in `Sequence from={...} durationInFrames={16|18}` so a cue cannot bleed across the next cut. Keep duration ≥ the WAV length (~0.3–0.5s).

## If sound feels late or “off”

1. Confirm `src` is `staticFile(...)`, not `https://remotion.media/...`.
2. Confirm `from` uses timing constants, not magic numbers.
3. Do not put two `Audio` elements on the same frame.
4. Render with `--browser-executable=/usr/bin/google-chrome-stable --gl=angle` in this VM.
5. `ffprobe` should show an AAC stereo stream; `silencedetect` should show bursts at the three cut times above.
