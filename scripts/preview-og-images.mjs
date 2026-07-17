/**
 * Renders marketing / referral / updates OG preview PNGs for design review.
 * Usage: bun scripts/preview-og-images.mjs [outDir]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { createElement } from "react";
import {
  BrandLockup,
  LandingAtmosphere,
  MarketingOgImage,
  OgCtaButton,
} from "../lib/og/shared.tsx";
import { ReferralOgImage } from "../lib/og/referral-opengraph.tsx";
import {
  getSiteMetadataCopy,
  getUpdatesOgCopy,
} from "../lib/og/site-metadata.ts";
import {
  OG_COLORS,
  OG_FONT_FAMILY,
  OG_PADDING,
  OG_TRACKING,
} from "../lib/og/tokens.ts";

const outDir = process.argv[2] ?? "tmp/og-previews";
await mkdir(outDir, { recursive: true });

async function renderPng(element, filename) {
  const response = new ImageResponse(element, {
    width: 1200,
    height: 630,
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const path = join(outDir, filename);
  await writeFile(path, buffer);
  console.log(`wrote ${path} (${buffer.length} bytes)`);
}

const en = getSiteMetadataCopy("en");
const fr = getSiteMetadataCopy("fr");
const updatesEn = getUpdatesOgCopy("en");

await renderPng(
  createElement(MarketingOgImage, {
    headline: en.ogHeadline,
    subheadline: en.ogSubheadline,
    cta: en.ogCta,
  }),
  "marketing-en.png",
);

await renderPng(
  createElement(MarketingOgImage, {
    headline: fr.ogHeadline,
    subheadline: fr.ogSubheadline,
    cta: fr.ogCta,
  }),
  "marketing-fr.png",
);

await renderPng(
  createElement(ReferralOgImage, {
    ref: "HUGO",
    joinLabel: "Join with referral code",
    tagline: "Get started on Deltalytix with a friend.",
    cta: "Claim invite →",
  }),
  "referral-en.png",
);

const updatesElement = createElement(
  "div",
  {
    style: {
      display: "flex",
      width: "100%",
      height: "100%",
      background: OG_COLORS.background,
      fontFamily: OG_FONT_FAMILY,
      padding: `${OG_PADDING}px`,
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "flex-start",
      position: "relative",
    },
  },
  createElement(LandingAtmosphere, { width: 340, height: 230 }),
  createElement(BrandLockup, { logoSize: 36, fontSize: 26 }),
  createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "760px",
        position: "relative",
      },
    },
    createElement(
      "h1",
      {
        style: {
          fontSize: "52px",
          fontWeight: 400,
          color: OG_COLORS.foreground,
          margin: "0",
          lineHeight: "1.12",
          letterSpacing: OG_TRACKING.display,
        },
      },
      "Smarter imports and clearer journals",
    ),
  ),
  createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 20,
        position: "relative",
      },
    },
    createElement(OgCtaButton, { label: updatesEn.cta }),
    createElement(
      "span",
      {
        style: {
          fontSize: "20px",
          fontWeight: 400,
          color: OG_COLORS.subtle,
          letterSpacing: OG_TRACKING.wide,
        },
      },
      "July 16, 2026",
    ),
  ),
);

await renderPng(updatesElement, "updates-en.png");

console.log("done");
