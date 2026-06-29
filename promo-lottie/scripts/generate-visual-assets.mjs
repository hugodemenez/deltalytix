#!/usr/bin/env node
/** Rasterize all visual assets (logo, text, stats, chips) for Skottie. */
import { writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/projects/deltalytix-promo/scene-1");
const FONT = join(__dirname, "../src/assets/fonts/Inter-VariableFont_opsz,wght.ttf");
const LOGO_SVG = join(OUT, "logo-mark.svg");

GlobalFonts.registerFromPath(FONT, "Inter");

function save(c, file) {
  writeFileSync(join(OUT, file), c.toBuffer("image/png"));
  console.log(`Wrote ${file}`);
}

async function renderLogo() {
  const size = 400;
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  const img = await loadImage(LOGO_SVG);
  ctx.drawImage(img, 0, 0, size, size);
  save(c, "logo-mark.png");
  return { id: "img_logo", w: size, h: size, p: "logo-mark.png" };
}

function renderText(file, text, font, w, h, color, tracking) {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (tracking) ctx.letterSpacing = tracking;
  ctx.fillText(text, w / 2, h / 2);
  save(c, file);
}

function renderCta() {
  const w = 260, h = 52;
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#2E9987";
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 8);
  ctx.fill();
  ctx.font = "600 17px Inter";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Get Started", w / 2, h / 2);
  save(c, "cta-button.png");
}

async function main() {
  const logo = await renderLogo();

  renderText("headline.png", "Master your trading journey.", "600 52px Inter", 1200, 80, "#ffffff");
  renderText("subline.png", "Advanced analytics for modern traders.", "400 22px Inter", 900, 40, "#8c949e");
  renderText("brand-name.png", "DELTALYTIX", "700 64px Inter", 700, 90, "#ffffff", "4px");
  renderText("brand-tagline.png", "Master your trading journey.", "400 20px Inter", 700, 36, "#8c949e");
  renderCta();

  const assets = [
    logo,
    { id: "img_headline", w: 1200, h: 80, p: "headline.png" },
    { id: "img_subline", w: 900, h: 40, p: "subline.png" },
    { id: "img_brand", w: 700, h: 90, p: "brand-name.png" },
    { id: "img_tagline", w: 700, h: 36, p: "brand-tagline.png" },
    { id: "img_cta", w: 260, h: 52, p: "cta-button.png" },
  ];

  const dashboardPath = join(OUT, "dashboard-screenshot.png");
  if (existsSync(dashboardPath)) {
    assets.push({ id: "img_dashboard", w: 1600, h: 815, p: "dashboard-screenshot.png" });
  }

  writeFileSync(join(OUT, "text-assets.json"), JSON.stringify(assets, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
