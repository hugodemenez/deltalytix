#!/usr/bin/env node
/** Verify Deltalytix promo renders in Skottie at key frames. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import CanvasKitInit from "canvaskit-wasm/full";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCENE_DIR = join(ROOT, "public/projects/deltalytix-promo/scene-1");
const SCENE = join(SCENE_DIR, "lottie.json");
const OUT = join(SCENE_DIR, "frames");

const FRAMES = [0, 60, 120, 210, 300, 419];

function loadAssets() {
  const manifest = JSON.parse(readFileSync(join(SCENE_DIR, "text-assets.json"), "utf8"));
  const assets = {};
  for (const { p } of manifest) {
    const fp = join(SCENE_DIR, p);
    if (existsSync(fp)) assets[p] = readFileSync(fp);
  }
  return assets;
}

async function main() {
  const CanvasKit = await CanvasKitInit({
    locateFile: () => join(ROOT, "public/canvaskit.wasm"),
  });

  const json = readFileSync(SCENE, "utf8");
  const anim = CanvasKit.MakeManagedAnimation(json, loadAssets());
  if (!anim) throw new Error("MakeManagedAnimation returned null");

  const [w, h] = anim.size();
  const totalFrames = Math.round(anim.duration() * anim.fps());
  console.log(`Animation: ${w}x${h}, ${totalFrames} frames @ ${anim.fps()}fps`);

  mkdirSync(OUT, { recursive: true });
  const tw = w;
  const th = h;

  for (const frame of FRAMES) {
    const surface = CanvasKit.MakeSurface(tw, th);
    if (!surface) throw new Error(`Could not create surface for frame ${frame}`);
    const canvas = surface.getCanvas();
    canvas.clear(CanvasKit.TRANSPARENT);
    anim.seekFrame(frame);
    anim.render(canvas, CanvasKit.LTRBRect(0, 0, tw, th));
    surface.flush();
    const image = surface.makeImageSnapshot();
    const png = image.encodeToBytes();
    if (!png) throw new Error(`Failed to encode frame ${frame}`);
    writeFileSync(join(OUT, `frame-${String(frame).padStart(3, "0")}.png`), new Uint8Array(png));
    console.log(`OK frame ${frame}`);
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
