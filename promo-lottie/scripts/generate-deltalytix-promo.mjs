#!/usr/bin/env node
/**
 * Deltalytix promo Lottie — image assets for logo/text/stats, vectors only for curve + bg.
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
  tealDim: [0.18, 0.6, 0.529, 0.18],
  grid: [0.14, 0.14, 0.16, 1],
};

const EASE = {
  settle: { o: { x: [0], y: [0.65] }, i: { x: [0.51], y: [0.99] } },
  entrance: { o: { x: [0.2], y: [0.75] }, i: { x: [0.34], y: [0.94] } },
  travel: { o: { x: [1], y: [0.49] }, i: { x: [0], y: [0.55] } },
  exit: { o: { x: [1], y: [0.02] }, i: { x: [0.54], y: [0.42] } },
};

const ASSETS = JSON.parse(readFileSync(join(OUT_DIR, "text-assets.json"), "utf8"));

function staticVal(v) {
  return { a: 0, k: v };
}

function groupTransform(x = 0, y = 0, sx = 100, sy = 100, opacity = 100) {
  return {
    ty: "tr",
    p: staticVal([x, y]),
    a: staticVal([0, 0]),
    s: staticVal([sx, sy]),
    r: staticVal(0),
    o: staticVal(opacity),
  };
}

function fill(color, slot = null) {
  return { ty: "fl", c: slot ? { sid: slot } : { a: 0, k: color }, o: staticVal(100) };
}

function stroke(color, width = 2) {
  return { ty: "st", c: staticVal(color), o: staticVal(100), w: staticVal(width), lc: 2, lj: 2 };
}

function rect(w, h) {
  return { ty: "rc", p: staticVal([0, 0]), s: staticVal([w, h]), r: staticVal(0) };
}

function path(vertices, closed = true) {
  const n = vertices.length;
  const z = Array(n).fill([0, 0]);
  return { ty: "sh", ks: staticVal({ i: z, o: z, v: vertices, c: closed }) };
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

function fadeIn(ip, out = null) {
  const k = [{ t: ip, s: [0] }, { t: ip + 16, s: [100], ...EASE.entrance }];
  if (out !== null) k.push({ t: out - 14, s: [100] }, { t: out, s: [0], ...EASE.exit });
  return { a: 1, k };
}

function popIn(ip, out = null) {
  return {
    o: fadeIn(ip, out),
    s: {
      a: 1,
      k: [
        { t: ip, s: [70, 70, 100], ...EASE.entrance },
        { t: ip + 24, s: [100, 100, 100], ...EASE.settle },
      ],
    },
  };
}

function logoImage(name, ip, y, scalePct, out = null) {
  const logo = ASSETS.find((a) => a.id === "img_logo");
  const anchor = [logo.w / 2, logo.h / 2];
  return imageLayer(name, "img_logo", anchor, [W / 2, y], {
    ip,
    ks: {
      o: fadeIn(ip, out),
      s: {
        a: 1,
        k: [
          { t: ip, s: [0, 0, 100], ...EASE.entrance },
          { t: ip + 30, s: [scalePct, scalePct, 100], ...EASE.settle },
        ],
      },
    },
  });
}

function buildAnimation() {
  const layers = [];

  // Background
  layers.push(shapeLayer("background", [
    shapeGroup("bg", [rect(W, H), fill(COLORS.bg, "bgColor")], groupTransform(-W / 2, -H / 2)),
  ], { ks: { p: staticVal([W / 2, H / 2, 0]) } }));

  // Chapter 1 — logo + headline (0–175)
  layers.push(logoImage("logo-hero", 8, 300, 55, 175));

  layers.push(shapeLayer("accent-line", [
    shapeGroup("line", [rect(240, 3), fill(COLORS.teal, "accentColor")], groupTransform(-120, 0)),
  ], {
    ip: 90,
    ks: {
      p: staticVal([W / 2, 410, 0]),
      o: fadeIn(90, 175),
      s: {
        a: 1,
        k: [
          { t: 90, s: [0, 100, 100], ...EASE.entrance },
          { t: 108, s: [100, 100, 100], ...EASE.settle },
        ],
      },
    },
  }));

  layers.push(imageLayer("headline", "img_headline", [600, 40], [W / 2, 470], {
    ip: 98,
    ks: {
      o: fadeIn(98, 175),
      p: {
        a: 1,
        k: [
          { t: 98, s: [W / 2, 490, 0], ...EASE.entrance },
          { t: 120, s: [W / 2, 470, 0], ...EASE.settle },
        ],
      },
    },
  }));

  layers.push(imageLayer("subline", "img_subline", [450, 20], [W / 2, 530], {
    ip: 118,
    ks: { o: fadeIn(118, 175) },
  }));

  // Chapter 2 — equity curve + stats (175–295)
  const pts = [
    [0, 180], [100, 155], [200, 168], [300, 125], [400, 108], [500, 118],
    [600, 78], [700, 62], [800, 74], [900, 45], [1000, 32], [1100, 0],
  ];
  const curve = [];
  for (let i = 0; i < 4; i++) {
    curve.push(shapeGroup(`grid-${i}`, [rect(1100, 1), fill(COLORS.grid)], groupTransform(-550, i * 55 - 82)));
  }
  curve.push(shapeGroup("area", [path([...pts, [1100, 200], [0, 200]]), fill(COLORS.tealDim)], groupTransform(-550, 0)));
  curve.push(shapeGroup("stroke", [
    path(pts, false),
    stroke(COLORS.teal, 3),
    {
      ty: "tm",
      s: staticVal(0),
      e: {
        a: 1,
        k: [
          { t: 180, s: [0], ...EASE.travel },
          { t: 240, s: [100], ...EASE.settle },
        ],
      },
      o: staticVal(0),
    },
  ], groupTransform(-550, 0)));

  layers.push(shapeLayer("equity-curve", curve, {
    ip: 172,
    ks: { p: staticVal([W / 2, 420, 0]), o: fadeIn(172, 295) },
  }));

  layers.push(imageLayer("stats", "img_stats", [550, 60], [W / 2, 580], {
    ip: 200,
    ks: popIn(200, 295),
  }));

  layers.push(imageLayer("chips", "img_chips", [348, 20], [W / 2, 690], {
    ip: 258,
    ks: popIn(258, 295),
  }));

  // Chapter 3 — CTA lockup (295–420)
  layers.push(logoImage("logo-final", 302, 240, 42));
  layers.push(imageLayer("brand-name", "img_brand", [350, 45], [W / 2, 370], { ip: 342, ks: { o: fadeIn(342) } }));
  layers.push(imageLayer("brand-tagline", "img_tagline", [350, 18], [W / 2, 430], { ip: 362, ks: { o: fadeIn(362) } }));
  layers.push(imageLayer("cta-button", "img_cta", [130, 26], [W / 2, 710], { ip: 384, ks: popIn(384) }));

  return {
    v: "5.7.0",
    fr: FR,
    ip: 0,
    op: OP,
    w: W,
    h: H,
    nm: "Deltalytix Promo — Master Your Trading Journey",
    slots: {
      bgColor: { p: { a: 0, k: COLORS.bg } },
      accentColor: { p: { a: 0, k: COLORS.teal } },
    },
    assets: ASSETS.map((a) => ({ ...a, u: "", e: 0 })),
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
