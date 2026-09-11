import PricingPlans from "@/components/pricing-plans";
import { getCurrentLocale, getI18n } from "@/locales/server";
import { getBackToWorkPricingDisplay } from "@/server/back-to-work-pricing";
import {
  formatBackToWorkOfferUntil,
  isBackToWorkOfferActive,
} from "@/lib/back-to-work-promo";
import { setStaticParamsLocale } from "next-international/server";

/**
 * Also rendered as the pricing section of the landing page. There it is nested
 * inside the landing `<main>` and below the hero `<h1>`, so it takes `embedded`
 * to drop to a `<div>` and an `<h2>` and keep the document outline valid — the
 * styling is identical either way.
 */
export default async function PricingPage({
  embedded = false,
  params,
}: {
  embedded?: boolean;
  params?: Promise<{ locale: string }>;
}) {
  if (params) {
    setStaticParamsLocale((await params).locale);
  }

  const t = await getI18n();
  const locale = await getCurrentLocale();
  const promo = await getBackToWorkPricingDisplay();
  const offerActive = isBackToWorkOfferActive(promo);
  const offerUntil = formatBackToWorkOfferUntil(promo.validUntilMs, locale);

  const Container = embedded ? "div" : "main";
  const Heading = embedded ? "h2" : "h1";

  return (
    <Container className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 md:py-28 lg:px-12">
      <div className="mb-12 text-center md:mb-16">
        <Heading className="text-balance text-5xl font-normal tracking-[-0.045em] md:text-7xl">
          {t("pricing.heading")}
        </Heading>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-black/55 dark:text-white/55 md:text-lg">
          {t("pricing.subheading")}
        </p>
        {offerActive ? (
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-black/55 dark:text-white/55">
            {offerUntil
              ? t("pricing.backToWork.sectionNoteUntil", { date: offerUntil })
              : t("pricing.backToWork.sectionNote")}
          </p>
        ) : null}
      </div>
      <PricingPlans promo={promo} />
    </Container>
  );
}
