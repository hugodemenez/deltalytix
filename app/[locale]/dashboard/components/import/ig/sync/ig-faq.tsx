"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCurrentLocale, useI18n } from "@/locales/client";

/** Official IG docs — Labs steps are English-only; France has a French overview. */
export const IG_API_KEY_DOCS = {
  labsGettingStarted: "https://labs.ig.com/gettingstarted",
  enHowTo: "https://www.ig.com/en/trading-platforms/trading-apis/how-to-use-ig-api",
  frHowTo:
    "https://www.ig.com/fr/plateformes-de-trading/api-de-trading/comment-utiliser-les-api-de-trading-ig",
  frHelp:
    "https://www.ig.com/fr/portail-d-aide/plateformes/questions-generales/comment-puis-je-acceder-a-l-api-ig-et-a-quoi-cela-sert-il",
  /** Recover forgotten username via the email on the account. */
  frLostDetails: "https://www.ig.com/fr/lost-details",
  enLostDetails: "https://www.ig.com/uk/lost-details",
  /** My IG → Configuration → Informations personnelles (username is editable there). */
  frPersonalInfo:
    "https://www.ig.com/fr/portail-d-aide/comptes-et-releves/mon-compte/comment-puis-je-mettre-a-jour-mes-informations-personnelles",
  enPersonalInfo:
    "https://www.ig.com/uk/help-and-support/account-and-trading/your-ig-account/how-do-i-update-my-personal-details",
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
 * Key creation happens on IG's site, in another tab. Keep the steps next to the
 * field they unblock rather than in the FAQ below the submit button, where
 * someone stuck on "where do I get this?" would never scroll to find them.
 */
export function IgApiKeyFieldHelp() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const [isOpen, setIsOpen] = useState(false);
  // Send readers only to docs in their own language. IG's Labs pages are
  // English-only, so the French sheet points at IG France's own API guides.
  const docs =
    locale === "fr"
      ? {
          primary: IG_API_KEY_DOCS.frHowTo,
          secondary: IG_API_KEY_DOCS.frHelp,
        }
      : {
          primary: IG_API_KEY_DOCS.labsGettingStarted,
          secondary: IG_API_KEY_DOCS.enHowTo,
        };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-black/45 underline underline-offset-2 transition-opacity hover:opacity-70 dark:text-white/45">
        {t("igSync.addAccount.createKeyToggle")}
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={1.75}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="mt-2 space-y-2 rounded-sm border border-black/10 bg-black/[0.02] p-3 text-xs leading-relaxed text-black/65 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/65">
          <ol className="list-decimal space-y-1 pl-4">
            <li>{t("igSync.addAccount.createKeyStep1")}</li>
            <li>{t("igSync.addAccount.createKeyStep2")}</li>
            <li>{t("igSync.addAccount.createKeyStep3")}</li>
            <li>{t("igSync.addAccount.createKeyStep4")}</li>
          </ol>
          <div className="flex flex-col gap-1.5 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
            <DocLink href={docs.primary}>
              {t("igSync.addAccount.linkPrimary")}
            </DocLink>
            <DocLink href={docs.secondary}>
              {t("igSync.addAccount.linkSecondary")}
            </DocLink>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

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
 * Collapsed answers to what the connect form raises: why two secrets, what we
 * call with the key, and how the credentials are stored. Creating the key is
 * not here — that one belongs beside the field, in <IgApiKeyFieldHelp />.
 */
export function IgFaq() {
  const t = useI18n();
  const locale = useCurrentLocale();
  const usernameDocs =
    locale === "fr"
      ? {
          personalInfo: IG_API_KEY_DOCS.frPersonalInfo,
          lostDetails: IG_API_KEY_DOCS.frLostDetails,
        }
      : {
          personalInfo: IG_API_KEY_DOCS.enPersonalInfo,
          lostDetails: IG_API_KEY_DOCS.enLostDetails,
        };

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
          value="username"
          className="border-black/10 dark:border-white/10"
        >
          <AccordionTrigger className={triggerClassName}>
            {t("igSync.faq.usernameQuestion")}
          </AccordionTrigger>
          <AccordionContent className={contentClassName}>
            <p>{t("igSync.faq.usernameAnswer")}</p>
            <div className="flex flex-col gap-1.5 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
              <DocLink href={usernameDocs.personalInfo}>
                {t("igSync.faq.usernameLinkPersonalInfo")}
              </DocLink>
              <DocLink href={usernameDocs.lostDetails}>
                {t("igSync.faq.usernameLinkLostDetails")}
              </DocLink>
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
