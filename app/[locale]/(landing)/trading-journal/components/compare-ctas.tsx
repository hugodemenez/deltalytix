"use client";

import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { localizeLandingHref } from "@/lib/landing-nav-paths";
import { captureMarketingCtaClicked } from "@/lib/marketing-analytics";
import {
  COMPARE_GET_STARTED_HREF,
  COMPARE_PRICING_HREF,
  getCompareCopy,
} from "../compare-copy";

function GetStartedLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span
      className="relative inline-flex items-center justify-center text-sm font-medium"
      aria-busy={pending}
    >
      <span className={pending ? "invisible" : undefined}>{children}</span>
      {pending && (
        <>
          <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden />
          <span className="sr-only">Loading…</span>
        </>
      )}
    </span>
  );
}

export function CompareCtas({
  locale,
  placement,
  layout = "row",
}: {
  locale: string;
  placement: string;
  layout?: "row" | "stack";
}) {
  const copy = getCompareCopy(locale);
  const pricingHref = localizeLandingHref(locale, COMPARE_PRICING_HREF);

  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 sm:flex-row"
      }
    >
      <Link
        href={COMPARE_GET_STARTED_HREF}
        onClick={() =>
          captureMarketingCtaClicked({
            ctaId: `${placement}_get_started`,
            destination: COMPARE_GET_STARTED_HREF,
            locale,
            placement,
          })
        }
        className="inline-flex h-12 w-full items-center justify-center rounded-[4px] bg-[oklch(0.22_0.01_95)] px-6 text-sm font-medium text-white transition-[opacity,transform] hover:opacity-85 active:scale-[0.96] sm:w-auto dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]"
      >
        <GetStartedLabel>{copy.cta.getStarted}</GetStartedLabel>
        <span className="ms-3">→</span>
      </Link>
      <Link
        href={pricingHref}
        onClick={() =>
          captureMarketingCtaClicked({
            ctaId: `${placement}_see_pricing`,
            destination: pricingHref,
            locale,
            placement,
          })
        }
        className="inline-flex h-12 w-full items-center justify-center rounded-[4px] border border-black/20 px-6 text-sm font-medium transition-[colors,transform] hover:bg-black/5 active:scale-[0.96] sm:w-auto dark:border-white/20 dark:hover:bg-white/5"
      >
        {copy.cta.seePricing}
      </Link>
    </div>
  );
}
