#!/usr/bin/env node
/** Rasterize headline text to PNG for Skottie-safe rendering. */
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/projects/deltalytix-promo/scene-1");
const FONT_PATH = join(__dirname, "../src/assets/fonts/Inter-VariableFont_opsz,wght.ttf");

GlobalFonts.registerFromPath(FONT_PATH, "Inter");

const TEXTS = [
  { file: "headline.png", text: "Master your trading journey.", font: "600 52px Inter", w: 1200, h: 80, color: "#ffffff" },
  { file: "subline.png", text: "Advanced analytics for modern traders.", font: "400 22px Inter", w: 900, h: 40, color: "#8c949e" },
  { file: "brand-name.png", text: "DELTALYTIX", font: "700 64px Inter", w: 700, h: 90, color: "#ffffff", tracking: "4px" },
  { file: "brand-tagline.png", text: "Master your trading journey.", font: "400 20px Inter", w: 700, h: 36, color: "#8c949e" },
];

function renderText({ file, text, font, w, h, color, tracking }) {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (tracking) ctx.letterSpacing = tracking;
  ctx.fillText(text, w / 2, h / 2);
  writeFileSync(join(OUT, file), canvas.toBuffer("image/png"));
  console.log(`Wrote ${file}`);
}

function renderCta() {
  const w = 240, h = 48;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#2E9987";
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 8);
  ctx.fill();
  ctx.font = "600 16px Inter";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Get Started", w / 2, h / 2);
  writeFileSync(join(OUT, "cta-button.png"), canvas.toBuffer("image/png"));
  console.log("Wrote cta-button.png");
}

for (const t of TEXTS) renderText(t);
renderCta();

// Export asset manifest for lottie generator
writeFileSync(
  join(OUT, "text-assets.json"),
  JSON.stringify(
    [
      { id: "img_headline", w: 1200, h: 80, p: "headline.png" },
      { id: "img_subline", w: 900, h: 40, p: "subline.png" },
      { id: "img_brand", w: 700, h: 90, p: "brand-name.png" },
      { id: "img_tagline", w: 700, h: 36, p: "brand-tagline.png" },
      { id: "img_cta", w: 240, h: 48, p: "cta-button.png" },
    ],
    null,
    2
  )
);
