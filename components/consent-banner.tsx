"use client";

import { ConsentRecordPrompt, getConsentRecordCopy } from "@/components/consent-record";
import { localizeLandingHref } from "@/lib/landing-nav-paths";
import { useCurrentLocale, useI18n } from "@/locales/client";

/**
 * Site-wide first-visit banner. Hidden for US (and other non-consent)
 * visitors; shown for EEA/UK/CH/unknown until they decide.
 */
export function ConsentBanner() {
  const t = useI18n();
  const locale = useCurrentLocale();

  return (
    <ConsentRecordPrompt
      copy={getConsentRecordCopy(t)}
      privacyHref={localizeLandingHref(locale, "/privacy#analytics")}
    />
  );
}
