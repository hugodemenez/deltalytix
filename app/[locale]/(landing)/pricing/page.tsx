"use client";

import { useEffect } from "react";
import PricingPlans from "@/components/pricing-plans";
import { useI18n } from "@/locales/landing-client";
import { getReferralCode } from "@/lib/referral-storage";

export default function PricingPage() {
  const t = useI18n();
  // Store referral code from URL on mount
  useEffect(() => {
    getReferralCode();
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
      <div className="mb-12 text-center md:mb-16">
        <h1 className="text-balance text-5xl font-normal tracking-[-0.045em] md:text-7xl">
          {t("pricing.heading")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-black/55 dark:text-white/55 md:text-lg">
          {t("pricing.subheading")}
        </p>
      </div>
      <PricingPlans />
    </main>
  );
}
