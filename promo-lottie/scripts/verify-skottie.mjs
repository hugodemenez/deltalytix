#!/usr/bin/env node
/** Verify Deltalytix promo renders in Skottie at key frames. */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import CanvasKitInit from "canvaskit-wasm/full";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCENE = join(ROOT, "public/projects/deltalytix-promo/scene-1/lottie.json");
const OUT = join(ROOT, "public/projects/deltalytix-promo/scene-1/frames");

const FRAMES = [0, 60, 120, 210, 300, 419];

async function main() {
  const wasmPath = join(ROOT, "public/canvaskit.wasm");
  const CanvasKit = await CanvasKitInit({
    locateFile: () => wasmPath,
  });

  const json = readFileSync(SCENE, "utf8");
  const sceneDir = dirname(SCENE);
  const assets = {};
  for (const name of ["headline.png", "subline.png", "brand-name.png", "brand-tagline.png", "cta-button.png"]) {
    const p = join(sceneDir, name);
    try {
      assets[name] = readFileSync(p);
    } catch {
      /* optional */
    }
  }
  const anim = CanvasKit.MakeManagedAnimation(json, assets);
  if (!anim) {
    console.error("FAILED: MakeManagedAnimation returned null");
    process.exit(1);
  }

  const [w, h] = anim.size();
  const op = anim.duration() * anim.fps();
  console.log(`Animation: ${w}x${h}, ${op} frames @ ${anim.fps()}fps`);

  mkdirSync(OUT, { recursive: true });
  const scale = 0.5;
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);

  for (const frame of FRAMES) {
    const surface = CanvasKit.MakeSurface(tw, th);
    if (!surface) {
      console.error(`FAILED: Could not create surface for frame ${frame}`);
      process.exit(1);
    }
    const canvas = surface.getCanvas();
    canvas.clear(CanvasKit.TRANSPARENT);
    anim.seekFrame(frame);
    anim.render(canvas, CanvasKit.LTRBRect(0, 0, tw, th));
    surface.flush();

    const image = surface.makeImageSnapshot();
    const png = image.encodeToBytes();
    if (!png) {
      console.error(`FAILED: encode frame ${frame}`);
      process.exit(1);
    }
    const outPath = join(OUT, `frame-${String(frame).padStart(3, "0")}.png`);
    writeFileSync(outPath, new Uint8Array(png));
    console.log(`OK frame ${frame} -> ${outPath}`);
    image.delete();
    surface.delete();
  }

  anim.delete();
  console.log("All frames rendered successfully in Skottie.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
