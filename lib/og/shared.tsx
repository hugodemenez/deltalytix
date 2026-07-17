import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import {
  OG_COLORS,
  OG_FONT_FAMILY,
  OG_PADDING,
  OG_RADIUS,
  OG_TRACKING,
} from "@/lib/og/tokens";

export const ogImageSize = { width: 1200, height: 630 };

export const ogImageCacheHeaders = {
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600",
  "CDN-Cache-Control": "public, max-age=3600",
  "Vercel-CDN-Cache-Control": "public, max-age=3600",
} as const;

export function LogoMark({
  sizePx = 40,
  color = OG_COLORS.foreground,
}: {
  sizePx?: number;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 255 255"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: sizePx, height: sizePx }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M159 63L127.5 0V255H255L236.5 218H159V63Z"
        fill={color}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M-3.05176e-05 255L127.5 -5.96519e-06L127.5 255L-3.05176e-05 255ZM64 217L121 104L121 217L64 217Z"
        fill={color}
      />
    </svg>
  );
}

export function BrandLockup({
  logoSize = 44,
  fontSize = 32,
  color = OG_COLORS.foreground,
}: {
  logoSize?: number;
  fontSize?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <LogoMark sizePx={logoSize} color={color} />
      <span
        style={{
          fontSize,
          fontWeight: 500,
          color,
          letterSpacing: OG_TRACKING.tight,
        }}
      >
        Deltalytix
      </span>
    </div>
  );
}

export function OgCtaButton({
  label,
  accentColor = OG_COLORS.cta,
  textColor = OG_COLORS.ctaText,
}: {
  label: string;
  accentColor?: string;
  textColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        alignSelf: "flex-start",
        padding: "16px 28px",
        borderRadius: OG_RADIUS.sm,
        background: accentColor,
      }}
    >
      <span
        style={{
          fontSize: 24,
          fontWeight: 500,
          color: textColor,
          letterSpacing: OG_TRACKING.snug,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/** Stylized daily P&L bars — no labels, no axes, no numbers. */
const OG_BAR_HEIGHTS = [
  0.42, 0.68, -0.28, 0.55, 0.22, -0.48, 0.78, 0.35, -0.18, 0.62, 0.48, -0.32,
  0.85, 0.3, -0.55, 0.58, 0.72, 0.18, -0.25, 0.92,
] as const;

function barColor(value: number): string {
  if (value > 0.05) return OG_COLORS.chartWin;
  if (value < -0.05) return OG_COLORS.chartLoss;
  return OG_COLORS.chartNeutral;
}

export function OgBarChart({
  width = 420,
  height = 280,
}: {
  width?: number;
  height?: number;
} = {}) {
  const gap = 8;
  const barWidth = Math.floor(
    (width - gap * (OG_BAR_HEIGHTS.length - 1)) / OG_BAR_HEIGHTS.length,
  );
  const midY = height / 2;
  const maxBar = midY - 8;

  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: midY,
          height: 1,
          background: OG_COLORS.hairline,
          display: "flex",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          gap,
        }}
      >
        {OG_BAR_HEIGHTS.map((value, index) => {
          const barH = Math.max(6, Math.abs(value) * maxBar);
          const isPositive = value >= 0;
          return (
            <div
              key={index}
              style={{
                display: "flex",
                width: barWidth,
                height: "100%",
                alignItems: isPositive ? "flex-end" : "flex-start",
                paddingTop: isPositive ? 0 : midY,
                paddingBottom: isPositive ? midY : 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: barH,
                  borderRadius: OG_RADIUS.sm,
                  background: barColor(value),
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Right-side visual: mint-washed frame wrapping a text-free bar chart.
 */
export function LandingAtmosphere({
  width = 420,
  height = 280,
  right = 48,
  bottom = 40,
}: {
  width?: number;
  height?: number;
  right?: number;
  bottom?: number;
} = {}) {
  const chartWidth = width - 48;
  const chartHeight = height - 48;

  return (
    <div
      style={{
        position: "absolute",
        right,
        bottom,
        width,
        height,
        borderRadius: OG_RADIUS.md,
        background: OG_COLORS.wash,
        display: "flex",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          borderRadius: OG_RADIUS.sm,
          background: OG_COLORS.surface,
          border: `1px solid ${OG_COLORS.hairline}`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <OgBarChart width={chartWidth} height={chartHeight} />
      </div>
    </div>
  );
}

type MarketingOgImageProps = {
  headline: string;
  subheadline: string;
  cta: string;
  /** @deprecated Kept for call-site compat; landing CTA color is used instead. */
  accentColor?: string;
};

export function MarketingOgImage({
  headline,
  subheadline,
  cta,
}: MarketingOgImageProps) {
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
      <LandingAtmosphere width={520} height={340} right={40} bottom={36} />

      <BrandLockup />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          maxWidth: 620,
          position: "relative",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 58,
            fontWeight: 400,
            color: OG_COLORS.foreground,
            lineHeight: 1.05,
            letterSpacing: OG_TRACKING.display,
          }}
        >
          {headline}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 400,
            color: OG_COLORS.muted,
            lineHeight: 1.4,
            letterSpacing: OG_TRACKING.snug,
            maxWidth: 560,
          }}
        >
          {subheadline}
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

export function createMarketingOgImageResponse({
  headline,
  subheadline,
  cta,
  accentColor,
}: MarketingOgImageProps) {
  return new ImageResponse(
    <MarketingOgImage
      headline={headline}
      subheadline={subheadline}
      cta={cta}
      accentColor={accentColor}
    />,
    {
      ...ogImageSize,
      headers: ogImageCacheHeaders,
    },
  );
}
