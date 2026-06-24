import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import type { ReactElement } from "react";

const size = { width: 1200, height: 630 };

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const saturation = 60 + (Math.abs(hash >> 8) % 30);
  const lightness = 50 + (Math.abs(hash >> 16) % 20);

  return hslToHex(hue, saturation, lightness);
}

function LogoMark({ sizePx = 40 }: { sizePx?: number }) {
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

function BrandLockup({ logoSize = 40, fontSize = 28 }: { logoSize?: number; fontSize?: number }) {
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

function DefaultOgImage() {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0f0f0f",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 520,
          height: 520,
          background: "radial-gradient(circle, rgba(124, 58, 237, 0.45) 0%, rgba(15, 15, 15, 0) 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -80,
          left: -80,
          width: 360,
          height: 360,
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(15, 15, 15, 0) 70%)",
          display: "flex",
        }}
      />
      <BrandLockup logoSize={96} fontSize={88} />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, rgba(20, 184, 166, 0.8) 0%, rgba(124, 58, 237, 0.8) 50%, rgba(220, 38, 38, 0.8) 100%)",
          display: "flex",
        }}
      />
    </div>
  ) as ReactElement;
}

function ReferralOgImage({ ref, accentColor }: { ref: string; accentColor: string }) {
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
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(10, 10, 10, 0) 70%)",
          display: "flex",
        }}
      />

      <BrandLockup />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          maxWidth: 900,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 500,
            color: "#a1a1aa",
            letterSpacing: "-0.01em",
          }}
        >
          Join with a referral code
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            padding: "28px 40px",
            borderRadius: 20,
            border: `3px solid ${accentColor}`,
            background: "rgba(255, 255, 255, 0.04)",
            boxShadow: `0 0 60px ${accentColor}33`,
          }}
        >
          <span
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {ref}
          </span>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 34,
            fontWeight: 600,
            color: "#f4f4f5",
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
          }}
        >
          Next generation trading dashboard
        </p>
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");
  const hasReferral = Boolean(ref && ref !== "Direct");
  const accentColor = hasReferral ? generateColorFromString(ref!) : "#7c3aed";

  const element = hasReferral ? (
    <ReferralOgImage ref={ref!} accentColor={accentColor} />
  ) : (
    <DefaultOgImage />
  );

  return new ImageResponse(element, {
    ...size,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600",
    },
  });
}
