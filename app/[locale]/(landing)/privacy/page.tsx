"use client";

import { AnalyticsOptOutLink } from "@/components/analytics-opt-out-link";
import { MCP_TOOL_PRIVACY_ROWS } from "@/lib/privacy/mcp-tool-disclosures";
import { useCurrentLocale, useI18n } from "@/locales/landing-client";

export default function PrivacyPolicy() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const contactEmail = t("privacy.contact.email");
  const lang = locale === "fr" ? "fr" : "en";

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
          <li>{t("privacy.collect.account")}</li>
          <li>{t("privacy.collect.trades")}</li>
          <li>{t("privacy.collect.journal")}</li>
          <li>{t("privacy.collect.connections")}</li>
          <li>{t("privacy.collect.billing")}</li>
          <li>{t("privacy.collect.analytics")}</li>
          <li>{t("privacy.collect.tokens")}</li>
          <li>{t("privacy.collect.aiChat")}</li>
          <li>{t("privacy.collect.aiFeatures")}</li>
          <li>{t("privacy.collect.technical")}</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.use.title")}</h2>
        <p>{t("privacy.use.lead")}</p>
        <ul className="mt-2 list-disc pl-5">
          <li>{t("privacy.use.service")}</li>
          <li>{t("privacy.use.notify")}</li>
          <li>{t("privacy.use.features")}</li>
          <li>{t("privacy.use.support")}</li>
          <li>{t("privacy.use.billing")}</li>
          <li>{t("privacy.use.ai")}</li>
          <li>{t("privacy.use.connectors")}</li>
          <li>{t("privacy.use.improve")}</li>
          <li>{t("privacy.use.monitor")}</li>
          <li>{t("privacy.use.security")}</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.processors.title")}</h2>
        <p>{t("privacy.processors.lead")}</p>
        <ul className="mt-2 list-disc pl-5">
          <li>{t("privacy.processors.supabase")}</li>
          <li>{t("privacy.processors.stripe")}</li>
          <li>{t("privacy.processors.posthog")}</li>
          <li>{t("privacy.processors.resend")}</li>
          <li>{t("privacy.processors.vercel")}</li>
          <li>{t("privacy.processors.aiProviders")}</li>
          <li>{t("privacy.processors.authorizedApps")}</li>
        </ul>
        <p className="mt-2">{t("privacy.processors.noSale")}</p>
      </section>

      <section id="retention" className="mb-6 scroll-mt-24">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.retention.title")}</h2>
        <p>{t("privacy.retention.lead")}</p>
        <ul className="mt-2 list-disc pl-5">
          <li>{t("privacy.retention.tradesJournal")}</li>
          <li>{t("privacy.retention.tokens")}</li>
          <li>{t("privacy.retention.billing")}</li>
          <li>{t("privacy.retention.analytics")}</li>
          <li>{t("privacy.retention.aiChat")}</li>
          <li>{t("privacy.retention.logs")}</li>
        </ul>
      </section>

      <section id="ai-apps-mcp" className="mb-6 scroll-mt-24">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.aiApps.title")}</h2>
        <p>{t("privacy.aiApps.lead")}</p>
        <p className="mt-2">{t("privacy.aiApps.scopes")}</p>
        <p className="mt-2">{t("privacy.aiApps.tableLead")}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-semibold">{t("privacy.aiApps.tableTool")}</th>
                <th className="py-2 pr-3 font-semibold">{t("privacy.aiApps.tableInputs")}</th>
                <th className="py-2 pr-3 font-semibold">{t("privacy.aiApps.tableOutputs")}</th>
                <th className="py-2 font-semibold">{t("privacy.aiApps.tableScope")}</th>
              </tr>
            </thead>
            <tbody>
              {MCP_TOOL_PRIVACY_ROWS.map((row) => (
                <tr key={row.name} className="border-b align-top">
                  <td className="py-3 pr-3 font-mono text-xs sm:text-sm">{row.name}</td>
                  <td className="py-3 pr-3">{row.inputs[lang]}</td>
                  <td className="py-3 pr-3">{row.outputs[lang]}</td>
                  <td className="py-3 font-mono text-xs sm:text-sm">{row.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4">{t("privacy.aiApps.access")}</p>
        <p className="mt-2">{t("privacy.aiApps.secrets")}</p>
        <p className="mt-2">{t("privacy.aiApps.recipient")}</p>
        <p className="mt-2">{t("privacy.aiApps.logging")}</p>
        <p className="mt-2">{t("privacy.aiApps.revoke")}</p>
        <p className="mt-2">{t("privacy.aiApps.webmcp")}</p>
        <p className="mt-2">{t("privacy.aiApps.inAppAi")}</p>
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
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.legal.title")}</h2>
        <p>{t("privacy.legal.basis")}</p>
        <p className="mt-2">{t("privacy.legal.transfers")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.rights.title")}</h2>
        <p>{t("privacy.rights.lead")}</p>
        <ul className="mt-2 list-disc pl-5">
          <li>{t("privacy.rights.access")}</li>
          <li>{t("privacy.rights.export")}</li>
          <li>{t("privacy.rights.delete")}</li>
          <li>{t("privacy.rights.analytics")}</li>
          <li>{t("privacy.rights.revoke")}</li>
        </ul>
        <p className="mt-2">{t("privacy.rights.contact")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.changes.title")}</h2>
        <p>{t("privacy.changes.content")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-2xl font-semibold">{t("privacy.contact.title")}</h2>
        <p>
          {t("privacy.contact.content")}{" "}
          <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
            {contactEmail}
          </a>
        </p>
      </section>

      <p className="mt-8 text-sm">{t("privacy.lastUpdated")}</p>
    </div>
  );
}
