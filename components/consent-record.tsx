"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Drawer } from "vaul";
import "./consent-record-drawer.css";

import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  persistConsentSettings,
  reconcileStoredConsent,
} from "@/lib/consent-persist";
import {
  CONSENT_COMPACT_SNAP,
  CONSENT_SHEET_SNAP,
  CONSENT_SNAP_POINTS,
  clampConsentSnapPoint,
} from "@/lib/consent-record-snaps";
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
  details: string;
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
    details: t("landing.consent.record.details"),
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
    <div className="flex items-start justify-between gap-4 py-3" data-vaul-no-drag>
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

      {showActions && onContinue && onAllowBoth && (
        <div className="mt-4">
          <ConsentRecordActions
            copy={copy}
            onContinue={onContinue}
            onAllowBoth={onAllowBoth}
            hugDesktop
          />
        </div>
      )}

      {showFooter && privacyHref && (
        <p
          className="mt-4 text-xs leading-4 text-black/45 dark:text-white/45"
          data-vaul-no-drag
        >
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
        "fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] z-50 w-[22rem] max-w-[22rem] rounded-sm p-5 sm:right-8 sm:bottom-[max(2rem,env(safe-area-inset-bottom,0px))] lg:right-12 lg:bottom-[max(3rem,env(safe-area-inset-bottom,0px))]",
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

function ConsentRecordActions({
  copy,
  onContinue,
  onAllowBoth,
  hugDesktop,
}: {
  copy: ConsentRecordCopy;
  onContinue: () => void;
  onAllowBoth: () => void;
  hugDesktop?: boolean;
}) {
  return (
    <div className="flex gap-2" data-vaul-no-drag>
      <button
        type="button"
        onClick={onContinue}
        className={cn(
          "inline-flex h-9 flex-1 items-center justify-center rounded-sm bg-[oklch(0.22_0.01_95)] px-3 text-sm font-medium text-white transition-[opacity,transform] hover:opacity-85 active:scale-[0.96] dark:bg-[oklch(0.94_0.01_95)] dark:text-[oklch(0.17_0_0)]",
          hugDesktop && "xl:flex-none",
        )}
      >
        {copy.continue}
      </button>
      <button
        type="button"
        onClick={onAllowBoth}
        className={cn(
          "inline-flex h-9 flex-1 items-center justify-center rounded-sm border border-[#E5E5E5] bg-white px-3 text-sm font-medium text-black transition-[colors,transform] hover:bg-black/5 active:scale-[0.96] dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/5",
          hugDesktop && "xl:flex-none",
        )}
      >
        {copy.allowBoth}
      </button>
    </div>
  );
}

function ConsentRecordCompactContent({
  copy,
  onOpen,
  onContinue,
  onAllowBoth,
}: {
  copy: ConsentRecordCopy;
  onOpen: () => void;
  onContinue: () => void;
  onAllowBoth: () => void;
}) {
  return (
    <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-baseline justify-between gap-4">
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={false}
          className="text-left text-base font-semibold leading-6 text-black dark:text-white"
        >
          {copy.title}
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={false}
          className="shrink-0 text-sm leading-6 text-black/55 transition-colors hover:text-black dark:text-white/55 dark:hover:text-white"
        >
          {copy.details}
        </button>
      </div>
      <div className="mt-3">
        <ConsentRecordActions
          copy={copy}
          onContinue={onContinue}
          onAllowBoth={onAllowBoth}
        />
      </div>
    </div>
  );
}

function ConsentRecordMobileDrawer({
  copy,
  choices,
  onChoicesChange,
  onContinue,
  onAllowBoth,
  privacyHref,
  open,
}: {
  copy: ConsentRecordCopy;
  choices: ConsentRecordChoices;
  onChoicesChange: (choices: ConsentRecordChoices) => void;
  onContinue: () => void;
  onAllowBoth: () => void;
  privacyHref: string;
  open: boolean;
}) {
  const [snap, setSnap] = useState<string | number | null>(CONSENT_COMPACT_SNAP);
  const isSheet = snap === CONSENT_SHEET_SNAP;

  useEffect(() => {
    if (open) setSnap(CONSENT_COMPACT_SNAP);
  }, [open]);

  const openSheet = () => setSnap(CONSENT_SHEET_SNAP);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setSnap(CONSENT_COMPACT_SNAP);
      }}
      dismissible={false}
      modal={false}
      shouldScaleBackground={false}
      setBackgroundColorOnScale={false}
      noBodyStyles
      disablePreventScroll
      handleOnly={false}
      snapToSequentialPoint
      snapPoints={[...CONSENT_SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={(next) => {
        setSnap((current) => {
          const currentSnap =
            current === CONSENT_SHEET_SNAP
              ? CONSENT_SHEET_SNAP
              : CONSENT_COMPACT_SNAP;
          return clampConsentSnapPoint(next, currentSnap);
        });
      }}
    >
      <Drawer.Portal>
        <Drawer.Content
          data-consent-record-drawer=""
          aria-labelledby="consent-record-drawer-title"
          className={cn(
            "fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col overflow-hidden rounded-t-sm outline-none",
            cardSurfaceClass,
          )}
        >
          <Drawer.Handle className="mx-auto mb-3 mt-2 h-1 w-10 shrink-0 rounded-full bg-[#E5E5E5] opacity-100 dark:bg-white/20" />
          <Drawer.Title id="consent-record-drawer-title" className="sr-only">
            {copy.title}
          </Drawer.Title>
          {isSheet ? (
            <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
            </div>
          ) : (
            <ConsentRecordCompactContent
              copy={copy}
              onOpen={openSheet}
              onContinue={onContinue}
              onAllowBoth={onAllowBoth}
            />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function ConsentRecordPrompt({
  copy,
  privacyHref,
}: {
  copy: ConsentRecordCopy;
  privacyHref: string;
}) {
  const isXl = useMediaQuery("(min-width: 1280px)");
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

  if (isXl) {
    return (
      <ConsentRecordCard
        copy={copy}
        choices={choices}
        onChoicesChange={setChoices}
        onContinue={() => save(choices)}
        onAllowBoth={() => save({ productUse: true, ads: true })}
        privacyHref={privacyHref}
      />
    );
  }

  return (
    <ConsentRecordMobileDrawer
      copy={copy}
      choices={choices}
      onChoicesChange={setChoices}
      onContinue={() => save(choices)}
      onAllowBoth={() => save({ productUse: true, ads: true })}
      privacyHref={privacyHref}
      open={visible}
    />
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
