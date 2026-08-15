"use client";

import {
  ConsentPrivacyControls,
  getConsentRecordCopy,
} from "@/components/consent-record";
import { useI18n } from "@/locales/landing-client";

export default function SettingsPage() {
  const t = useI18n();
  const copy = getConsentRecordCopy(t);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        {copy.settings}
      </h1>
      <section id="privacy" className="mt-10 scroll-mt-24">
        <h2 className="text-xl font-semibold text-foreground">{copy.privacy}</h2>
        <div className="mt-6 rounded-sm border border-[#E5E5E5] bg-white p-5 dark:border-white/15 dark:bg-[oklch(0.17_0_0)]">
          <ConsentPrivacyControls copy={copy} />
        </div>
      </section>
    </div>
  );
}
