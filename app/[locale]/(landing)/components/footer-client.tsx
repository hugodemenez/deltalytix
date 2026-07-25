"use client";

import { useI18n } from "@/locales/landing-client";
import { FooterContent } from "./footer-content";

/** Client footer for pages that already live under a client boundary (e.g. /teams). */
export default function FooterClient() {
  const t = useI18n();

  return (
    <FooterContent
      discordInvitation={process.env.NEXT_PUBLIC_DISCORD_INVITATION || ""}
      copy={{
        heading: t("footer.heading"),
        description: t("footer.description"),
        productTitle: t("footer.product.title"),
        productFeatures: t("footer.product.features"),
        productPricing: t("footer.product.pricing"),
        productPropfirms: t("footer.product.propfirms"),
        productTeams: t("footer.product.teams"),
        productSupport: t("footer.product.support"),
        companyTitle: t("footer.company.title"),
        companyAbout: t("footer.company.about"),
        legalTitle: t("footer.legal.title"),
        legalPrivacy: t("footer.legal.privacy"),
        legalTerms: t("footer.legal.terms"),
        legalDisclaimers: t("footer.legal.disclaimers"),
        copyright: t("footer.copyright", { year: 2026 }),
        riskDisclaimer: t("disclaimer.risk.content"),
        hypotheticalDisclaimer: t("disclaimer.hypothetical.content"),
      }}
    />
  );
}
