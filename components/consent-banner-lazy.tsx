"use client";

import dynamic from "next/dynamic";

export const ConsentBannerLazy = dynamic(
  () => import("@/components/consent-banner").then((mod) => mod.ConsentBanner),
  { ssr: false }
);
