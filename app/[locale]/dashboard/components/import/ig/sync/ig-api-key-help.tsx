"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { useCurrentLocale, useI18n } from "@/locales/client";

/** Official IG docs — Labs steps are English-only; France has a French overview. */
export const IG_API_KEY_DOCS = {
  labsGettingStarted: "https://labs.ig.com/gettingstarted",
  enHowTo: "https://www.ig.com/en/trading-platforms/trading-apis/how-to-use-ig-api",
  frHowTo:
    "https://www.ig.com/fr/plateformes-de-trading/api-de-trading/comment-utiliser-les-api-de-trading-ig",
  frHelp:
    "https://www.ig.com/fr/portail-d-aide/plateformes/questions-generales/comment-puis-je-acceder-a-l-api-ig-et-a-quoi-cela-sert-il",
} as const;

const linkClassName =
  "inline-flex items-center gap-1 font-medium text-black underline underline-offset-2 hover:opacity-80 dark:text-white";

function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
    </a>
  );
}

/**
 * In-form guide for creating an IG Labs API key and what Deltalytix uses it for.
 * IG keys have no OAuth-style scopes — we document Deltalytix’s usage instead.
 */
export function IgApiKeyHelp() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const isFr = locale === "fr";

  return (
    <div className="space-y-3 rounded-sm border border-black/10 bg-black/[0.02] p-3 text-xs leading-relaxed text-black/65 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/65">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-black dark:text-white">
          {t("igSync.addAccount.apiKeyGuideTitle")}
        </p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>{t("igSync.addAccount.apiKeyStep1")}</li>
          <li>{t("igSync.addAccount.apiKeyStep2")}</li>
          <li>{t("igSync.addAccount.apiKeyStep3")}</li>
          <li>{t("igSync.addAccount.apiKeyStep4")}</li>
        </ol>
      </div>

      <div className="space-y-1.5 border-t border-black/10 pt-3 dark:border-white/10">
        <p className="text-sm font-medium text-black dark:text-white">
          {t("igSync.addAccount.apiKeyScopeTitle")}
        </p>
        <p>{t("igSync.addAccount.apiKeyScopeIntro")}</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>{t("igSync.addAccount.apiKeyScopeRead")}</li>
          <li>{t("igSync.addAccount.apiKeyScopeNoTrade")}</li>
          <li>{t("igSync.addAccount.apiKeyScopeMatchEnv")}</li>
        </ul>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-black/10 pt-3 dark:border-white/10 sm:flex-row sm:flex-wrap sm:gap-x-4">
        <DocLink href={IG_API_KEY_DOCS.labsGettingStarted}>
          {t("igSync.addAccount.apiKeyLinkLabs")}
        </DocLink>
        {isFr ? (
          <>
            <DocLink href={IG_API_KEY_DOCS.frHowTo}>
              {t("igSync.addAccount.apiKeyLinkFrGuide")}
            </DocLink>
            <DocLink href={IG_API_KEY_DOCS.frHelp}>
              {t("igSync.addAccount.apiKeyLinkFrHelp")}
            </DocLink>
          </>
        ) : (
          <DocLink href={IG_API_KEY_DOCS.enHowTo}>
            {t("igSync.addAccount.apiKeyLinkEnGuide")}
          </DocLink>
        )}
      </div>
    </div>
  );
}
