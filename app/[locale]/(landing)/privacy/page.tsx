"use client";

import { AnalyticsOptOutLink } from "@/components/analytics-opt-out-link";
import { useI18n } from "@/locales/landing-client";

export default function PrivacyPolicy() {
  const t = useI18n();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t("privacy.title")}</h1>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.intro.title")}</h2>
        <p>{t("privacy.intro.content")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.collect.title")}</h2>
        <p>{t("privacy.collect.lead")}</p>
        <ul className="mt-2 list-disc pl-5">
          <li>{t("privacy.collect.email")}</li>
          <li>{t("privacy.collect.name")}</li>
          <li>{t("privacy.collect.discord")}</li>
        </ul>
        <p className="mt-2">{t("privacy.collect.trades")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.use.title")}</h2>
        <p>{t("privacy.use.lead")}</p>
        <ul className="mt-2 list-disc pl-5">
          <li>{t("privacy.use.service")}</li>
          <li>{t("privacy.use.notify")}</li>
          <li>{t("privacy.use.features")}</li>
          <li>{t("privacy.use.support")}</li>
          <li>{t("privacy.use.improve")}</li>
          <li>{t("privacy.use.monitor")}</li>
          <li>{t("privacy.use.security")}</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.storage.title")}</h2>
        <p>{t("privacy.storage.content")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.cookies.title")}</h2>
        <p>{t("privacy.cookies.content")}</p>
      </section>

      <section id="analytics" className="mb-6 scroll-mt-24">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.analytics.title")}</h2>
        <p>{t("privacy.analytics.provider")}</p>
        <p className="mt-2">{t("privacy.analytics.beforeConsent")}</p>
        <p className="mt-2">{t("privacy.analytics.afterConsent")}</p>
        <p className="mt-2">{t("privacy.analytics.otherRegions")}</p>
        <p className="mt-2">{t("privacy.analytics.conversions")}</p>
        <p className="mt-4">
          <AnalyticsOptOutLink
            label={t("privacy.analytics.optOut")}
            optedOutLabel={t("privacy.analytics.optedOut")}
            className="text-primary hover:underline"
          />
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.thirdParty.title")}</h2>
        <p>{t("privacy.thirdParty.content")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.gdpr.title")}</h2>
        <p>{t("privacy.gdpr.content")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.changes.title")}</h2>
        <p>{t("privacy.changes.content")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.contact.title")}</h2>
        <p>
          {t("privacy.contact.content")}{" "}
          <a href="mailto:privacy@deltalytix.com" className="text-primary hover:underline">
            privacy@deltalytix.com
          </a>
        </p>
      </section>

      <p className="mt-8 text-sm">{t("privacy.lastUpdated")}</p>
    </div>
  );
}
