# Deltalytix Promo Animation

Production-ready Lottie promo for [Deltalytix](https://deltalytix.com) — built with the [diffusionstudio/lottie](https://github.com/diffusionstudio/lottie) text-to-lottie skill and verified in Skia Skottie.

## Preview

Open the Skottie player and navigate to the scene:

```bash
npm install
npm run dev
# → http://localhost:3030/deltalytix-promo/scene-1
```

Scrub key frames:

| Frame | Beat |
| --- | --- |
| 0–90 | Logo assemble-reveal |
| 90–175 | Headline: "Master your trading journey." |
| 175–295 | Dashboard proof (equity curve + KPIs) |
| 295–420 | Brand lockup + CTA |

Pin a frame: `?frame=120`, `?frame=210`, `?frame=419`

## Specs

- **Canvas:** 1920×1080 (16:9)
- **Duration:** 7s @ 60fps (420 frames)
- **Brand colors:** `#09090b` background, `#2E9987` teal accent
- **Slots:** `bgColor`, `accentColor` (editable in player properties panel)

## Regenerate

```bash
npm run generate:deltalytix-promo   # text PNGs + lottie.json
npm run verify:deltalytix-promo      # Skottie frame export check
```

## Files

```
public/projects/deltalytix-promo/scene-1/
  lottie.json          # main animation
  controls.json        # slot labels
  headline.png         # rasterized Inter headlines
  subline.png
  brand-name.png
  brand-tagline.png
  cta-button.png
  frames/              # verification stills (generated)
```

## Use in Deltalytix

Import `lottie.json` + image assets via [lottie-web](https://github.com/airbnb/lottie-web), [lottie-react](https://www.npmjs.com/package/lottie-react), or React Native Skia Skottie.
