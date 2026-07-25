"use client";

import dynamic from "next/dynamic";

const ConsentBanner = dynamic(
  () => import("@/components/consent-banner").then((m) => m.ConsentBanner),
  { ssr: false },
);

export function DeferredConsentBanner() {
  return <ConsentBanner />;
}
