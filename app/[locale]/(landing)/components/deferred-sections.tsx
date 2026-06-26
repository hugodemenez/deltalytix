"use client";

import nextDynamic from "next/dynamic";
import {
  FAQSectionSkeleton,
  FeaturesSectionSkeleton,
  PricingSectionSkeleton,
} from "./section-skeletons";

const Features = nextDynamic(() => import("./features"), {
  loading: () => <FeaturesSectionSkeleton />,
  ssr: false,
});

const PricingPage = nextDynamic(() => import("../pricing/page"), {
  loading: () => <PricingSectionSkeleton />,
  ssr: false,
});

const FAQ = nextDynamic(() => import("./faq"), {
  loading: () => <FAQSectionSkeleton />,
  ssr: false,
});

export function DeferredLandingSections() {
  return (
    <>
      <section id="features" className="w-full">
        <Features />
      </section>
      <section id="pricing" className="w-full">
        <PricingPage />
      </section>
      <section id="faq" className="w-full">
        <FAQ />
      </section>
    </>
  );
}
