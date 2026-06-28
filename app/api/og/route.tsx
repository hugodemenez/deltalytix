import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import type { ReactElement } from "react";
import { getReferralOgCopy } from "@/lib/og/referral-copy";
import {
  createReferralOgImageResponse,
  referralOgSize,
} from "@/lib/og/referral-opengraph";
import { isValidReferralSlug } from "@/lib/referral-url";

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <svg viewBox="0 0 255 255" xmlns="http://www.w3.org/2000/svg" style={{ width: 96, height: 96 }}>
          <path fillRule="evenodd" clipRule="evenodd" d="M159 63L127.5 0V255H255L236.5 218H159V63Z" fill="#FFFFFF" />
          <path fillRule="evenodd" clipRule="evenodd" d="M-3.05176e-05 255L127.5 -5.96519e-06L127.5 255L-3.05176e-05 255ZM64 217L121 104L121 217L64 217Z" fill="#FFFFFF" />
        </svg>
        <span
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
          }}
        >
          Deltalytix
        </span>
      </div>
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");
  const locale = searchParams.get("locale") ?? "en";
  const hasReferral = Boolean(ref && ref !== "Direct" && isValidReferralSlug(ref));

  if (hasReferral) {
    const copy = await getReferralOgCopy(locale);
    return createReferralOgImageResponse({
      ref: ref!,
      joinLabel: copy.joinLabel,
      tagline: copy.tagline,
    });
  }

  return new ImageResponse(<DefaultOgImage />, {
    ...referralOgSize,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600",
    },
  });
}
