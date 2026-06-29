#!/usr/bin/env node
/** Render Deltalytix promo Lottie to MP4 via Skottie + ffmpeg. */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import CanvasKitInit from "canvaskit-wasm/full";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCENE = join(ROOT, "public/projects/deltalytix-promo/scene-1/lottie.json");
const SCENE_DIR = dirname(SCENE);
const FRAMES_DIR = join(SCENE_DIR, "render-frames");
const OUT_MP4 = join(SCENE_DIR, "deltalytix-promo.mp4");

// 1280x720 keeps quality high while staying within WASM memory limits
const SCALE = Number(process.env.RENDER_SCALE ?? 1280 / 1920);
const BATCH = 70;

function loadAssets() {
  const manifest = JSON.parse(readFileSync(join(SCENE_DIR, "text-assets.json"), "utf8"));
  const assets = {};
  for (const { p } of manifest) {
    const fp = join(SCENE_DIR, p);
    if (existsSync(fp)) assets[p] = readFileSync(fp);
  }
  return assets;
}

function loadAnim(CanvasKit) {
  const json = readFileSync(SCENE, "utf8");
  const anim = CanvasKit.MakeManagedAnimation(json, loadAssets());
  if (!anim) throw new Error("MakeManagedAnimation returned null");
  return anim;
}

function renderBatch(CanvasKit, start, end, tw, th) {
  const anim = loadAnim(CanvasKit);
  const surface = CanvasKit.MakeSurface(tw, th);
  if (!surface) throw new Error("Could not create surface");
  const canvas = surface.getCanvas();

  for (let frame = start; frame < end; frame++) {
    canvas.clear(CanvasKit.TRANSPARENT);
    anim.seekFrame(frame);
    anim.render(canvas, CanvasKit.LTRBRect(0, 0, tw, th));
    surface.flush();

    const image = surface.makeImageSnapshot();
    const png = image.encodeToBytes();
    if (!png) throw new Error(`Failed to encode frame ${frame}`);
    writeFileSync(join(FRAMES_DIR, `frame-${String(frame).padStart(4, "0")}.png`), new Uint8Array(png));
    image.delete();
  }

  surface.delete();
  anim.delete();
  console.log(`  frames ${start}–${end - 1}`);
}

async function main() {
  const wasmPath = join(ROOT, "public/canvaskit.wasm");
  const CanvasKit = await CanvasKitInit({ locateFile: () => wasmPath });

  const probe = loadAnim(CanvasKit);
  const [w, h] = probe.size();
  const fps = probe.fps();
  const totalFrames = Math.round(probe.duration() * fps);
  probe.delete();

  const tw = Math.round(w * SCALE);
  const th = Math.round(h * SCALE);
  console.log(`Rendering ${totalFrames} frames @ ${fps}fps (${tw}x${th}) in batches of ${BATCH}...`);

  if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true });
  mkdirSync(FRAMES_DIR, { recursive: true });

  for (let start = 0; start < totalFrames; start += BATCH) {
    const end = Math.min(start + BATCH, totalFrames);
    renderBatch(CanvasKit, start, end, tw, th);
  }

  console.log("Encoding MP4...");
  const ff = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-framerate", String(fps),
      "-i", join(FRAMES_DIR, "frame-%04d.png"),
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", "17",
      "-preset", "medium",
      "-movflags", "+faststart",
      OUT_MP4,
    ],
    { stdio: "inherit" }
  );

  if (ff.status !== 0) throw new Error("ffmpeg failed");

  const count = readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".png")).length;
  console.log(`Done: ${OUT_MP4} (${count} frames)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
