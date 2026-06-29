#!/usr/bin/env node
/** Extract dashboard screenshot from beta demo video. */
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/projects/deltalytix-promo/scene-1");
const ASSETS = join(OUT_DIR, "assets");
const DEMO_URL = "https://beta.deltalytix.app/videos/demo_dark.mp4";
const FRAME_TIME = 12; // full dashboard visible with equity curve + KPIs

mkdirSync(ASSETS, { recursive: true });

const demoMp4 = join(ASSETS, "demo_dark.mp4");
const frameJpg = join(ASSETS, `demo-frame-${FRAME_TIME}s.jpg`);
const dashboardPng = join(OUT_DIR, "dashboard-screenshot.png");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} failed`);
}

if (!existsSync(demoMp4)) {
  console.log("Downloading demo video...");
  run("curl", ["-sL", "-o", demoMp4, DEMO_URL]);
}

console.log(`Extracting frame at ${FRAME_TIME}s...`);
run("ffmpeg", ["-y", "-ss", String(FRAME_TIME), "-i", demoMp4, "-frames:v", "1", "-q:v", "2", frameJpg]);

console.log("Scaling dashboard screenshot...");
run("ffmpeg", ["-y", "-i", frameJpg, "-vf", "scale=1600:-1", dashboardPng]);

console.log(`Done: ${dashboardPng}`);
