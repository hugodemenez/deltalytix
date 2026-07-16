import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import {
  BrandLockup,
  LandingAtmosphere,
  OgCtaButton,
  loadLandingProductPosterSrc,
  ogImageCacheHeaders,
  ogImageSize,
} from "@/lib/og/shared";
import {
  OG_COLORS,
  OG_FONT_FAMILY,
  OG_PADDING,
  OG_RADIUS,
  OG_TRACKING,
} from "@/lib/og/tokens";

export const referralOgSize = ogImageSize;

type ReferralOgImageProps = {
  ref: string;
  joinLabel: string;
  tagline: string;
  cta: string;
  productSrc?: string;
};

export function ReferralOgImage({
  ref,
  joinLabel,
  tagline,
  cta,
  productSrc,
}: ReferralOgImageProps) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: OG_COLORS.background,
        fontFamily: OG_FONT_FAMILY,
        position: "relative",
        padding: `${OG_PADDING}px`,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <LandingAtmosphere width={380} height={250} productSrc={productSrc} />

      <BrandLockup />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 820,
          position: "relative",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 400,
            color: OG_COLORS.muted,
            letterSpacing: OG_TRACKING.snug,
          }}
        >
          {joinLabel}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            padding: "20px 32px",
            borderRadius: OG_RADIUS.sm,
            border: `1px solid ${OG_COLORS.hairline}`,
            background: OG_COLORS.surface,
          }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 500,
              color: OG_COLORS.foreground,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {ref}
          </span>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 400,
            color: OG_COLORS.foreground,
            lineHeight: 1.3,
            letterSpacing: OG_TRACKING.tight,
            maxWidth: 700,
          }}
        >
          {tagline}
        </p>

        <OgCtaButton label={cta} />
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 400,
          color: OG_COLORS.subtle,
          position: "relative",
        }}
      >
        deltalytix.app
      </p>
    </div>
  ) as ReactElement;
}

export async function createReferralOgImageResponse({
  ref,
  joinLabel,
  tagline,
  cta,
}: {
  ref: string;
  joinLabel: string;
  tagline: string;
  cta: string;
}) {
  const productSrc = await loadLandingProductPosterSrc();

  return new ImageResponse(
    <ReferralOgImage
      ref={ref}
      joinLabel={joinLabel}
      tagline={tagline}
      cta={cta}
      productSrc={productSrc}
    />,
    {
      ...referralOgSize,
      headers: ogImageCacheHeaders,
    },
  );
}
