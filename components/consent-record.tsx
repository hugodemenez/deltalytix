"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { Switch } from "@/components/ui/switch";
import {
  persistConsentSettings,
  reconcileStoredConsent,
} from "@/lib/consent-persist";
import {
  CONSENT_RESET_EVENT,
  CONSENT_UPDATED_EVENT,
  type ConsentRecordChoices,
  fromRecordChoices,
  hasClientConsentDecision,
  parseSharedAnalyticsConsent,
  readStoredConsentSettings,
  toRecordChoices,
} from "@/lib/consent-settings";
import { cn } from "@/lib/utils";

export type ConsentRecordCopy = {
  title: string;
  sub: string;
  productUseTitle: string;
  productUseDescription: string;
  adsTitle: string;
  adsDescription: string;
  continue: string;
  allowBoth: string;
  footer: string;
  settings: string;
  privacy: string;
};

export function getConsentRecordCopy(
  // landing-client and locales/client both expose these keys; their `t`
  // signatures disagree on the params slot, so keep this helper permissive.
  t: (key: string, ...args: never[]) => string,
): ConsentRecordCopy {
  return {
    title: t("landing.consent.record.title"),
    sub: t("landing.consent.record.sub"),
    productUseTitle: t("landing.consent.record.productUse.title"),
    productUseDescription: t("landing.consent.record.productUse.description"),
    adsTitle: t("landing.consent.record.ads.title"),
    adsDescription: t("landing.consent.record.ads.description"),
    continue: t("landing.consent.record.continue"),
    allowBoth: t("landing.consent.record.allowBoth"),
    footer: t("landing.consent.record.footer"),
    settings: t("landing.consent.record.settings"),
    privacy: t("landing.consent.record.privacy"),
  };
}

function readChoicesFromStores(): ConsentRecordChoices {
  return toRecordChoices(
    readStoredConsentSettings(),
    parseSharedAnalyticsConsent(document.cookie),
  );
}

const cardSurfaceClass =
  "border border-[#E5E5E5] bg-white text-[oklch(0.17_0_0)] dark:border-white/15 dark:bg-[oklch(0.17_0_0)] dark:text-[oklch(0.93_0_0)]";

const switchClass =
  "h-5 w-9 border-transparent shadow-none data-[state=checked]:bg-[oklch(0.22_0.01_95)] data-[state=unchecked]:bg-[#D4D4D4] dark:data-[state=checked]:bg-[oklch(0.94_0.01_95)] dark:data-[state=unchecked]:bg-white/25 [&_[data-slot=thumb],span]:h-4 [&_[data-slot=thumb],span]:w-4 [&_[data-slot=thumb],span]:shadow-none data-[state=checked]:[&>span]:translate-x-4";

function ConsentSwitchRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const descriptionId = `${id}-description`;

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="text-sm font-semibold leading-5 text-black dark:text-white"
        >
          {title}
        </label>
        <p
          id={descriptionId}
          className="mt-1 text-sm leading-5 text-black/55 dark:text-white/55"
        >
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={descriptionId}
        className={cn("mt-0.5 shrink-0", switchClass)}
      />
    </div>
  );
}

function ConsentRecordBody({
  copy,
  choices,
  onChoicesChange,
  idPrefix,
  showActions,
  onContinue,
  onAllowBoth,
  privacyHref,
  showFooter,
}: {
  copy: ConsentRecordCopy;
  choices: ConsentRecordChoices;
  onChoicesChange: (choices: ConsentRecordChoices) => void;
  idPrefix: string;
  showActions?: boolean;
  onContinue?: () => void;
  onAllowBoth?: () => void;
  privacyHref?: string;
  showFooter?: boolean;
}) {
  const titleId = `${idPrefix}-title`;

  return (
    <div className="flex flex-col">
      <div>
        <h2
          id={titleId}
          className="text-base font-semibold leading-6 text-black dark:text-white"
        >
          {copy.title}
        </h2>
        <p className="mt-1 text-sm leading-5 text-black/55 dark:text-white/55">
          {copy.sub}
        </p>
      </div>

      <div className="mt-3">
        <ConsentSwitchRow
          id={`${idPrefix}-product-use`}
          title={copy.productUseTitle}
          description={copy.productUseDescription}
          checked={choices.productUse}
          onCheckedChange={(productUse) =>
            onChoicesChange({ ...choices, productUse })
          }
        />
        <div className="h-px bg-[#E5E5E5] dark:bg-white/15" />
        <ConsentSwitchRow
          id={`${idPrefix}-ads`}
          title={copy.adsTitle}
          description={copy.adsDescription}
          checked={choices.ads}
          onCheckedChange={(ads) => onChoicesChange({ ...choices, ads })}
        />
      </div>

      {showActions && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-3 text-sm font-medium text-white transition-[opacity,transform] hover:opacity-85 active:scale-[0.96] dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)] xl:flex-none"
          >
            {copy.continue}
          </button>
          <button
            type="button"
            onClick={onAllowBoth}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-sm border border-[#E5E5E5] bg-white px-3 text-sm font-medium text-black transition-[colors,transform] hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/5 xl:flex-none"
          >
            {copy.allowBoth}
          </button>
        </div>
      )}

      {showFooter && privacyHref && (
        <p className="mt-4 text-xs leading-4 text-black/45 dark:text-white/45">
          <Link
            href={privacyHref}
            className="underline-offset-2 transition-colors hover:text-black hover:underline dark:hover:text-white"
          >
            {copy.footer}
          </Link>
        </p>
      )}
    </div>
  );
}

export function ConsentRecordCard({
  copy,
  choices,
  onChoicesChange,
  onContinue,
  onAllowBoth,
  privacyHref,
  className,
}: {
  copy: ConsentRecordCopy;
  choices: ConsentRecordChoices;
  onChoicesChange: (choices: ConsentRecordChoices) => void;
  onContinue: () => void;
  onAllowBoth: () => void;
  privacyHref: string;
  className?: string;
}) {
  return (
    <aside
      aria-labelledby="consent-record-card-title"
      className={cn(
        "w-full max-w-[22rem] rounded-sm p-5",
        cardSurfaceClass,
        className,
      )}
    >
      <ConsentRecordBody
        copy={copy}
        choices={choices}
        onChoicesChange={onChoicesChange}
        idPrefix="consent-record-card"
        showActions
        onContinue={onContinue}
        onAllowBoth={onAllowBoth}
        privacyHref={privacyHref}
        showFooter
      />
    </aside>
  );
}

export function ConsentRecordSheet({
  copy,
  choices,
  onChoicesChange,
  onContinue,
  onAllowBoth,
  privacyHref,
}: {
  copy: ConsentRecordCopy;
  choices: ConsentRecordChoices;
  onChoicesChange: (choices: ConsentRecordChoices) => void;
  onContinue: () => void;
  onAllowBoth: () => void;
  privacyHref: string;
}) {
  return (
    <aside
      aria-labelledby="consent-record-sheet-title"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 rounded-t-sm px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2",
        cardSurfaceClass,
      )}
    >
      <div
        className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E5E5E5] dark:bg-white/20"
        aria-hidden
      />
      <ConsentRecordBody
        copy={copy}
        choices={choices}
        onChoicesChange={onChoicesChange}
        idPrefix="consent-record-sheet"
        showActions
        onContinue={onContinue}
        onAllowBoth={onAllowBoth}
        privacyHref={privacyHref}
        showFooter
      />
    </aside>
  );
}

export function ConsentRecordPrompt({
  copy,
  privacyHref,
}: {
  copy: ConsentRecordCopy;
  privacyHref: string;
}) {
  const [visible, setVisible] = useState(false);
  const [choices, setChoices] = useState<ConsentRecordChoices>({
    productUse: false,
    ads: false,
  });

  useEffect(() => {
    const syncVisibility = () => {
      setVisible(!hasClientConsentDecision());
      setChoices(readChoicesFromStores());
    };

    syncVisibility();
    window.addEventListener(CONSENT_RESET_EVENT, syncVisibility);
    window.addEventListener(CONSENT_UPDATED_EVENT, syncVisibility);
    return () => {
      window.removeEventListener(CONSENT_RESET_EVENT, syncVisibility);
      window.removeEventListener(CONSENT_UPDATED_EVENT, syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.setAttribute("data-consent-banner", "visible");
    } else {
      document.body.removeAttribute("data-consent-banner");
    }
    return () => {
      document.body.removeAttribute("data-consent-banner");
    };
  }, [visible]);

  if (!visible) return null;

  const save = (next: ConsentRecordChoices) => {
    persistConsentSettings(fromRecordChoices(next));
    setVisible(false);
  };

  return (
    <div className="contents">
      <div className="hidden shrink-0 xl:block">
        <ConsentRecordCard
          copy={copy}
          choices={choices}
          onChoicesChange={setChoices}
          onContinue={() => save(choices)}
          onAllowBoth={() => save({ productUse: true, ads: true })}
          privacyHref={privacyHref}
        />
      </div>
      <div className="xl:hidden">
        <ConsentRecordSheet
          copy={copy}
          choices={choices}
          onChoicesChange={setChoices}
          onContinue={() => save(choices)}
          onAllowBoth={() => save({ productUse: true, ads: true })}
          privacyHref={privacyHref}
        />
      </div>
    </div>
  );
}

export function ConsentPrivacyControls({
  copy,
}: {
  copy: ConsentRecordCopy;
}) {
  const reactId = useId();
  const [choices, setChoices] = useState<ConsentRecordChoices>({
    productUse: false,
    ads: false,
  });

  useEffect(() => {
    reconcileStoredConsent();
    setChoices(readChoicesFromStores());

    const sync = () => setChoices(readChoicesFromStores());
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    window.addEventListener(CONSENT_RESET_EVENT, sync);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener(CONSENT_RESET_EVENT, sync);
    };
  }, []);

  const update = (next: ConsentRecordChoices) => {
    setChoices(next);
    persistConsentSettings(fromRecordChoices(next));
  };

  return (
    <ConsentRecordBody
        copy={copy}
        choices={choices}
        onChoicesChange={update}
        idPrefix={`consent-privacy-${reactId}`}
        showFooter={false}
      />
  );
}
