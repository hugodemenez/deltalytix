#!/usr/bin/env node
/**
 * Generates Deltalytix promo Lottie animation.
 * Brand: teal #2E9987, bg #09090b.
 */
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/projects/deltalytix-promo/scene-1");

const W = 1920;
const H = 1080;
const FR = 60;
const OP = 420;

const COLORS = {
  bg: [0.035, 0.035, 0.043, 1],
  teal: [0.18, 0.6, 0.529, 1],
  tealDim: [0.18, 0.6, 0.529, 0.22],
  white: [1, 1, 1, 1],
  muted: [0.55, 0.58, 0.62, 1],
  win: [0.063, 0.725, 0.506, 1],
  chipBg: [0.1, 0.1, 0.12, 1],
  grid: [0.12, 0.12, 0.14, 1],
};

const EASE = {
  settle: { o: { x: [0], y: [0.65] }, i: { x: [0.51], y: [0.99] } },
  entrance: { o: { x: [0.2], y: [0.75] }, i: { x: [0.34], y: [0.94] } },
  travel: { o: { x: [1], y: [0.49] }, i: { x: [0], y: [0.55] } },
  exit: { o: { x: [1], y: [0.02] }, i: { x: [0.54], y: [0.42] } },
};

const IMAGE_ASSETS = JSON.parse(
  readFileSync(join(OUT_DIR, "text-assets.json"), "utf8")
);

function staticVal(v) {
  return { a: 0, k: v };
}

function groupTransform(x = 0, y = 0, sx = 100, sy = 100, rot = 0, opacity = 100) {
  return { ty: "tr", p: staticVal([x, y]), a: staticVal([0, 0]), s: staticVal([sx, sy]), r: staticVal(rot), o: staticVal(opacity) };
}

function fill(color, slot = null) {
  const c = slot ? { sid: slot } : { a: 0, k: color };
  return { ty: "fl", c, o: staticVal(100) };
}

function stroke(color, width = 2) {
  return { ty: "st", c: staticVal(color), o: staticVal(100), w: staticVal(width), lc: 2, lj: 2 };
}

function rect(w, h, r = 0) {
  return { ty: "rc", p: staticVal([0, 0]), s: staticVal([w, h]), r: staticVal(r) };
}

function ellipse(rx, ry) {
  return { ty: "el", p: staticVal([0, 0]), s: staticVal([rx * 2, ry * 2]) };
}

function path(vertices, closed = true) {
  const n = vertices.length;
  const zeros = Array(n).fill([0, 0]);
  return { ty: "sh", ks: staticVal({ i: zeros, o: zeros, v: vertices, c: closed }) };
}

function shapeGroup(name, items, transform) {
  return { ty: "gr", nm: name, it: [...items, transform] };
}

function shapeLayer(name, shapes, opts = {}) {
  const { ip = 0, op = OP, ks = {} } = opts;
  return {
    ty: 4, nm: name, ip, op, st: 0,
    ks: {
      o: ks.o ?? staticVal(100),
      r: ks.r ?? staticVal(0),
      a: ks.a ?? staticVal([0, 0, 0]),
      s: ks.s ?? staticVal([100, 100, 100]),
      p: ks.p ?? staticVal([W / 2, H / 2, 0]),
    },
    shapes,
  };
}

function imageLayer(name, refId, anchor, position, opts = {}) {
  const { ip = 0, op = OP, ks = {} } = opts;
  return {
    ty: 2, nm: name, refId, ip, op, st: 0,
    ks: {
      o: ks.o ?? staticVal(100),
      r: ks.r ?? staticVal(0),
      a: staticVal([anchor[0], anchor[1], 0]),
      s: ks.s ?? staticVal([100, 100, 100]),
      p: ks.p ?? staticVal([position[0], position[1], 0]),
    },
  };
}

function fade(ip, out = null) {
  const k = [{ t: ip, s: [0] }, { t: ip + 14, s: [100], ...EASE.entrance }];
  if (out !== null) k.push({ t: out - 12, s: [100] }, { t: out, s: [0], ...EASE.exit });
  return { a: 1, k };
}

function slideUp(ip, y, out = null) {
  const k = [
    { t: ip, s: [W / 2, y + 24, 0], ...EASE.entrance },
    { t: ip + 22, s: [W / 2, y, 0], ...EASE.settle },
  ];
  return { a: 1, k };
}

const LOGO_RIGHT = [[159, 63], [127.5, 0], [127.5, 255], [255, 255], [236.5, 218], [159, 218]];
const LOGO_LEFT = [[0, 255], [127.5, 0], [127.5, 255], [0, 255]];
const LOGO_CUT = [[64, 217], [121, 104], [121, 217], [64, 217]];

function logoShapes(color = COLORS.white) {
  const ox = -127.5, oy = -127.5;
  return [
    shapeGroup("right", [path(LOGO_RIGHT), fill(color)], groupTransform(ox, oy)),
    shapeGroup("left", [path(LOGO_LEFT), fill(color)], groupTransform(ox, oy)),
    shapeGroup("cut", [path(LOGO_CUT), fill(COLORS.bg)], groupTransform(ox, oy)),
  ];
}

function logoLayer(name, enterFrame, y, scale = 55, fadeOut = null) {
  return shapeLayer(name, logoShapes(), {
    ip: enterFrame,
    ks: {
      p: {
        a: 1,
        k: [
          { t: enterFrame, s: [W / 2, y + 50, 0], ...EASE.entrance },
          { t: enterFrame + 28, s: [W / 2, y, 0], ...EASE.settle },
        ],
      },
      s: {
        a: 1,
        k: [
          { t: enterFrame, s: [0, 0, 100], ...EASE.entrance },
          { t: enterFrame + 32, s: [scale, scale, 100], ...EASE.settle },
        ],
      },
      o: fade(enterFrame, fadeOut),
    },
  });
}

const GLYPH_W = 14, GLYPH_H = 22, GLYPH_GAP = 5;
const FONT = {
  W: [[0,0,4,22],[10,0,4,22],[0,0,3,22],[5,0,4,22],[9,0,3,22],[0,18,12,4]],
  I: [[4,0,6,4],[5,0,4,22],[4,18,6,4]],
  N: [[0,0,4,22],[10,0,4,22],[0,0,14,22]],
  R: [[0,0,4,22],[0,0,12,4],[12,0,4,8],[0,9,10,4],[8,13,6,9]],
  A: [[0,4,4,18],[10,4,4,18],[0,16,14,4],[2,9,10,4]],
  T: [[0,0,14,4],[5,0,4,22]],
  E: [[0,0,4,22],[0,0,12,4],[0,9,10,4],[0,18,12,4]],
  "+": [[5,4,4,14],[0,9,14,4]],
  $: [[4,0,8,4],[0,6,12,4],[4,12,8,4],[0,18,12,4],[6,0,2,22]],
  ",": [[5,18,4,6]],
  "0": [[0,4,4,18],[10,4,4,18],[0,4,14,4],[0,18,14,4]],
  "1": [[4,0,6,4],[5,0,4,22]],
  "2": [[0,4,14,4],[10,4,4,8],[0,12,14,4],[0,16,4,6]],
  "3": [[0,0,12,4],[10,0,4,22],[0,9,10,4],[0,18,12,4]],
  "4": [[8,0,4,22],[0,12,14,4],[10,12,4,10]],
  "5": [[0,0,12,4],[0,0,4,10],[0,12,10,4],[10,12,4,10],[0,18,12,4]],
  "6": [[0,4,4,18],[0,4,10,4],[0,12,10,4],[10,12,4,10],[0,18,10,4]],
  "7": [[0,0,14,4],[10,0,4,22]],
  "8": [[0,4,4,8],[10,4,4,8],[0,4,14,4],[0,12,14,4],[0,18,14,4],[10,12,4,10]],
  "9": [[10,4,4,14],[0,0,12,4],[0,9,10,4],[10,9,4,13]],
  "%": [[0,0,5,8],[9,14,5,8],[2,10,10,2]],
  " ": [],
  P: [[0,0,4,22],[0,0,12,4],[12,0,4,8],[0,9,10,4]],
  L: [[0,0,4,22],[0,18,12,4]],
  O: [[0,4,4,18],[10,4,4,18],[0,4,14,4],[0,18,14,4]],
  F: [[0,0,4,22],[0,0,12,4],[0,9,10,4]],
  M: [[0,0,4,22],[10,0,4,22],[0,0,14,4],[4,9,6,4]],
  U: [[0,4,4,18],[10,4,4,18],[0,18,14,4]],
  B: [[0,0,4,22],[0,0,10,4],[10,0,4,8],[0,9,10,4],[10,12,4,10],[0,18,10,4]],
  C: [[10,4,4,14],[0,4,10,4],[0,18,10,4]],
  H: [[0,0,4,22],[10,0,4,22],[0,9,14,4]],
  G: [[0,4,4,18],[10,8,4,14],[0,4,14,4],[0,18,14,4],[8,14,6,4]],
  S: [[4,0,10,4],[0,4,4,8],[4,12,10,4],[10,16,4,6],[0,18,10,4]],
  D: [[0,0,4,22],[0,0,10,4],[0,18,10,4],[10,4,4,14]],
};

function buildTextGroup(text, color, scale) {
  const items = [];
  let x = 0;
  for (const ch of text.toUpperCase()) {
    for (const [rx, ry, rw, rh] of FONT[ch] ?? []) {
      items.push(shapeGroup("r", [rect(rw * scale, rh * scale), fill(color)], groupTransform(x + rx * scale, ry * scale)));
    }
    x += (GLYPH_W + GLYPH_GAP) * scale;
  }
  const totalW = x - GLYPH_GAP * scale;
  return shapeGroup("text", items, groupTransform(-totalW / 2, -GLYPH_H * scale / 2));
}

function statBlock(label, value, x, y, enterFrame, valueColor, fadeOut) {
  const labelG = buildTextGroup(label, COLORS.muted, 1.0);
  const valueG = buildTextGroup(value, valueColor, 2.2);
  labelG.it[labelG.it.length - 1].p.k[1] = -28;
  valueG.it[valueG.it.length - 1].p.k[1] = 18;
  return shapeLayer(`stat-${label}`, [labelG, valueG], {
    ip: enterFrame,
    ks: { p: staticVal([x, y, 0]), o: fade(enterFrame, fadeOut) },
  });
}

function featureChip(label, x, y, enterFrame, fadeOut) {
  const textG = buildTextGroup(label, COLORS.white, 0.95);
  const tw = (label.length * (GLYPH_W + GLYPH_GAP) - GLYPH_GAP) * 0.95 + 44;
  return shapeLayer(`chip-${label}`, [
    shapeGroup("bg", [rect(tw, 36, 18), fill(COLORS.chipBg)], groupTransform(-tw / 2, -18)),
    shapeGroup("dot", [ellipse(4, 4), fill(COLORS.teal, "accentColor")], groupTransform(-tw / 2 + 14, 0)),
    textG,
  ], { ip: enterFrame, ks: { p: staticVal([x, y, 0]), o: fade(enterFrame, fadeOut) } });
}

function buildAnimation() {
  const layers = [];

  layers.push(shapeLayer("background", [
    shapeGroup("bg", [rect(W, H), fill(COLORS.bg, "bgColor")], groupTransform(-W / 2, -H / 2)),
  ], { ks: { p: staticVal([W / 2, H / 2, 0]) } }));

  layers.push(shapeLayer("ambient-glow", [
    shapeGroup("glow", [ellipse(380, 380), fill([0.18, 0.6, 0.529, 0.07])], groupTransform(0, 0)),
  ], { ks: { p: staticVal([W / 2, 340, 0]), o: { a: 1, k: [{ t: 0, s: [0] }, { t: 24, s: [100], ...EASE.settle }] } } }));

  // Ch1: Logo + headline
  layers.push(logoLayer("logo-hero", 6, 310, 58, 175));
  layers.push(shapeLayer("accent-line", [
    shapeGroup("line", [rect(280, 3, 1.5), fill(COLORS.teal, "accentColor")], groupTransform(-140, 0)),
  ], { ip: 88, ks: { p: staticVal([W / 2, 420, 0]), o: fade(88, 175), s: { a: 1, k: [{ t: 88, s: [0, 100, 100], ...EASE.entrance }, { t: 106, s: [100, 100, 100], ...EASE.settle }] } } }));

  layers.push(imageLayer("headline", "img_headline", [600, 40], [W / 2, 470], {
    ip: 96, ks: { o: fade(96, 175), p: slideUp(96, 470, 175) },
  }));
  layers.push(imageLayer("subline", "img_subline", [450, 20], [W / 2, 530], {
    ip: 118, ks: { o: fade(118, 175), p: slideUp(118, 530, 175) },
  }));

  // Ch2: Dashboard proof
  const pts = [[0,200],[80,170],[160,185],[240,140],[320,120],[400,135],[480,90],[560,70],[640,85],[720,50],[800,35],[880,48],[960,20],[1040,10],[1120,0]];
  const curveShapes = [];
  for (let i = 0; i < 4; i++) curveShapes.push(shapeGroup(`g${i}`, [rect(1120, 1), fill(COLORS.grid)], groupTransform(0, i * 70 - 105)));
  curveShapes.push(shapeGroup("area", [path([...pts, [1120, 220], [0, 220]]), fill(COLORS.tealDim)], groupTransform(0, 0)));
  curveShapes.push(shapeGroup("line", [path(pts, false), stroke(COLORS.teal, 3), {
    ty: "tm", s: staticVal(0), e: { a: 1, k: [{ t: 178, s: [0], ...EASE.travel }, { t: 233, s: [100], ...EASE.settle }] }, o: staticVal(0),
  }], groupTransform(0, 0)));
  layers.push(shapeLayer("equity-curve", curveShapes, { ip: 170, ks: { p: staticVal([W / 2, 520, 0]), o: fade(170, 295) } }));

  layers.push(statBlock("WIN RATE", "68%", 520, 680, 200, COLORS.win, 295));
  layers.push(statBlock("NET PNL", "+$12,480", 960, 680, 218, COLORS.teal, 295));
  layers.push(statBlock("TRADES", "247", 1400, 680, 236, COLORS.white, 295));
  layers.push(featureChip("AI COACH", 480, 800, 258, 295));
  layers.push(featureChip("PROP FIRM", 960, 800, 272, 295));
  layers.push(featureChip("MULTI BROKER", 1440, 800, 286, 295));

  // Ch3: CTA lockup
  layers.push(logoLayer("logo-final", 300, 250, 48));
  layers.push(imageLayer("brand-name", "img_brand", [350, 45], [W / 2, 380], { ip: 340, ks: { o: fade(340) } }));
  layers.push(imageLayer("brand-tagline", "img_tagline", [350, 18], [W / 2, 440], { ip: 362, ks: { o: fade(362) } }));
  layers.push(imageLayer("cta-button", "img_cta", [120, 24], [W / 2, 720], {
    ip: 385, ks: { o: fade(385), s: { a: 1, k: [{ t: 385, s: [85, 85, 100], ...EASE.entrance }, { t: 405, s: [100, 100, 100], ...EASE.settle }] } },
  }));

  return {
    v: "5.7.0", fr: FR, ip: 0, op: OP, w: W, h: H,
    nm: "Deltalytix Promo — Master Your Trading Journey",
    slots: {
      bgColor: { p: { a: 0, k: COLORS.bg } },
      accentColor: { p: { a: 0, k: COLORS.teal } },
    },
    assets: IMAGE_ASSETS.map((a) => ({ ...a, u: "", e: 0 })),
    layers: layers.reverse(),
  };
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "lottie.json"), JSON.stringify(buildAnimation(), null, 2));
writeFileSync(join(OUT_DIR, "controls.json"), JSON.stringify({
  controls: [
    { sid: "bgColor", label: "Background color" },
    { sid: "accentColor", label: "Accent color (teal)" },
  ],
}, null, 2));
console.log(`Generated ${OUT_DIR}/lottie.json (${OP} frames @ ${FR}fps)`);
