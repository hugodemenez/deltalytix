"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

const triggerClassName = "py-3 text-left text-sm font-normal hover:no-underline";

const contentClassName =
  "space-y-2 pb-3 text-xs leading-relaxed text-black/65 dark:text-white/65";

/**
 * The one line users must read before the fields: IG needs two credentials and
 * they do different jobs. Everything else lives collapsed in <IgFaq />.
 */
export function IgConnectIntro() {
  const t = useI18n();

  return (
    <p className="text-sm leading-relaxed text-black/55 dark:text-white/55">
      {t("igSync.addAccount.intro")}
    </p>
  );
}

/**
 * Collapsed answers to what the connect form raises: why two secrets, how to
 * create the key, what we call with it, and how the credentials are stored.
 * IG keys have no OAuth-style scopes — we document Deltalytix's usage instead.
 */
export function IgFaq() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const isFr = locale === "fr";

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
        {t("igSync.faq.title")}
      </p>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="why-both"
          className="border-black/10 dark:border-white/10"
        >
          <AccordionTrigger className={triggerClassName}>
            {t("igSync.faq.whyBothQuestion")}
          </AccordionTrigger>
          <AccordionContent className={contentClassName}>
            <p>{t("igSync.faq.whyBothAnswer")}</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="create-key"
          className="border-black/10 dark:border-white/10"
        >
          <AccordionTrigger className={triggerClassName}>
            {t("igSync.faq.createKeyQuestion")}
          </AccordionTrigger>
          <AccordionContent className={contentClassName}>
            <ol className="list-decimal space-y-1 pl-4">
              <li>{t("igSync.faq.createKeyStep1")}</li>
              <li>{t("igSync.faq.createKeyStep2")}</li>
              <li>{t("igSync.faq.createKeyStep3")}</li>
              <li>{t("igSync.faq.createKeyStep4")}</li>
            </ol>
            <div className="flex flex-col gap-1.5 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
              <DocLink href={IG_API_KEY_DOCS.labsGettingStarted}>
                {t("igSync.faq.linkLabs")}
              </DocLink>
              {isFr ? (
                <>
                  <DocLink href={IG_API_KEY_DOCS.frHowTo}>
                    {t("igSync.faq.linkFrGuide")}
                  </DocLink>
                  <DocLink href={IG_API_KEY_DOCS.frHelp}>
                    {t("igSync.faq.linkFrHelp")}
                  </DocLink>
                </>
              ) : (
                <DocLink href={IG_API_KEY_DOCS.enHowTo}>
                  {t("igSync.faq.linkEnGuide")}
                </DocLink>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="scope"
          className="border-black/10 dark:border-white/10"
        >
          <AccordionTrigger className={triggerClassName}>
            {t("igSync.faq.scopeQuestion")}
          </AccordionTrigger>
          <AccordionContent className={contentClassName}>
            <p>{t("igSync.faq.scopeIntro")}</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>{t("igSync.faq.scopeSignIn")}</li>
              <li>{t("igSync.faq.scopeHistory")}</li>
              <li>{t("igSync.faq.scopeNoTrade")}</li>
              <li>{t("igSync.faq.scopeMatchEnv")}</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="storage"
          className="border-b-0 border-black/10 dark:border-white/10"
        >
          <AccordionTrigger className={triggerClassName}>
            {t("igSync.faq.storageQuestion")}
          </AccordionTrigger>
          <AccordionContent className={contentClassName}>
            <p>{t("igSync.faq.storageEncrypted")}</p>
            <p>{t("igSync.faq.storageWhyPassword")}</p>
            <p>{t("igSync.faq.storageRevoke")}</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
