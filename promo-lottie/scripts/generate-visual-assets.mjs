#!/usr/bin/env node
/** Rasterize all visual assets (logo, text, stats, chips) for Skottie. */
import { writeFileSync } from "fs";
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

function renderStatsPanel() {
  const w = 1100, h = 120;
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  const cols = [
    { label: "Win Rate", value: "68%", color: "#10B981" },
    { label: "Net P&L", value: "+$12,480", color: "#2E9987" },
    { label: "Trades", value: "247", color: "#ffffff" },
  ];
  cols.forEach((col, i) => {
    const cx = w / 6 + i * (w / 3);
    ctx.font = "500 18px Inter";
    ctx.fillStyle = "#8c949e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(col.label, cx, 36);
    ctx.font = "700 42px Inter";
    ctx.fillStyle = col.color;
    ctx.fillText(col.value, cx, 82);
  });
  save(c, "stats-panel.png");
}

function renderFeatureChips() {
  const labels = ["AI Coach", "Prop Firm", "Multi-Broker"];
  const chipW = 200, chipH = 40, gap = 48;
  const w = labels.length * chipW + (labels.length - 1) * gap;
  const c = createCanvas(w, chipH);
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, w, chipH);
  let x = 0;
  for (const label of labels) {
    ctx.fillStyle = "#1a1a1f";
    ctx.beginPath();
    ctx.roundRect(x, 0, chipW, chipH, 20);
    ctx.fill();
    ctx.fillStyle = "#2E9987";
    ctx.beginPath();
    ctx.arc(x + 18, chipH / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "500 15px Inter";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 32, chipH / 2);
    x += chipW + gap;
  }
  save(c, "feature-chips.png");
}

async function main() {
  const logo = await renderLogo();

  renderText("headline.png", "Master your trading journey.", "600 52px Inter", 1200, 80, "#ffffff");
  renderText("subline.png", "Advanced analytics for modern traders.", "400 22px Inter", 900, 40, "#8c949e");
  renderText("brand-name.png", "DELTALYTIX", "700 64px Inter", 700, 90, "#ffffff", "4px");
  renderText("brand-tagline.png", "Master your trading journey.", "400 20px Inter", 700, 36, "#8c949e");
  renderCta();
  renderStatsPanel();
  renderFeatureChips();

  const assets = [
    logo,
    { id: "img_headline", w: 1200, h: 80, p: "headline.png" },
    { id: "img_subline", w: 900, h: 40, p: "subline.png" },
    { id: "img_brand", w: 700, h: 90, p: "brand-name.png" },
    { id: "img_tagline", w: 700, h: 36, p: "brand-tagline.png" },
    { id: "img_cta", w: 260, h: 52, p: "cta-button.png" },
    { id: "img_stats", w: 1100, h: 120, p: "stats-panel.png" },
    { id: "img_chips", w: 696, h: 40, p: "feature-chips.png" },
  ];

  writeFileSync(join(OUT, "text-assets.json"), JSON.stringify(assets, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
