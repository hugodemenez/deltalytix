import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

export const ogImageSize = { width: 1200, height: 630 };

export const ogImageCacheHeaders = {
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600",
  "CDN-Cache-Control": "public, max-age=3600",
  "Vercel-CDN-Cache-Control": "public, max-age=3600",
} as const;

export function LogoMark({ sizePx = 40 }: { sizePx?: number }) {
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
        fill="#FFFFFF"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M-3.05176e-05 255L127.5 -5.96519e-06L127.5 255L-3.05176e-05 255ZM64 217L121 104L121 217L64 217Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function BrandLockup({
  logoSize = 40,
  fontSize = 28,
}: {
  logoSize?: number;
  fontSize?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <LogoMark sizePx={logoSize} />
      <span
        style={{
          fontSize,
          fontWeight: 700,
          color: "#FFFFFF",
          letterSpacing: "-0.03em",
        }}
      >
        Deltalytix
      </span>
    </div>
  );
}

export function OgCtaButton({
  label,
  accentColor = "#14B8A6",
}: {
  label: string;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        alignSelf: "flex-start",
        padding: "18px 32px",
        borderRadius: 999,
        background: accentColor,
        boxShadow: `0 4px 20px ${accentColor}44`,
      }}
    >
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#FFFFFF",
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

type MarketingOgImageProps = {
  headline: string;
  subheadline: string;
  cta: string;
  accentColor?: string;
};

export function MarketingOgImage({
  headline,
  subheadline,
  cta,
  accentColor = "#14B8A6",
}: MarketingOgImageProps) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        padding: "56px 72px",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 480,
          height: 480,
          background: `radial-gradient(circle, ${accentColor}55 0%, rgba(10, 10, 10, 0) 72%)`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 320,
          height: 320,
          background: `radial-gradient(circle, ${accentColor}40 0%, rgba(10, 10, 10, 0) 70%)`,
          display: "flex",
        }}
      />

      <BrandLockup />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 920,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 58,
            fontWeight: 800,
            color: "#FFFFFF",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
          }}
        >
          {headline}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 500,
            color: "#a1a1aa",
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
          }}
        >
          {subheadline}
        </p>
        <OgCtaButton label={cta} accentColor={accentColor} />
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 500,
          color: "#71717a",
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
