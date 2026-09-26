"use client";

import { useEffect, useState } from "react";

import { persistAnalyticsOptOut } from "@/lib/consent-persist";
import { hasClientAnalyticsConsent } from "@/lib/consent-settings";
import { CONSENT_UPDATED_EVENT, CONSENT_RESET_EVENT } from "@/lib/consent-settings";
import { cn } from "@/lib/utils";

export function AnalyticsOptOutLink({
  label,
  optedOutLabel,
  className,
}: {
  label: string;
  optedOutLabel: string;
  className?: string;
}) {
  const [optedOut, setOptedOut] = useState(false);

  useEffect(() => {
    const sync = () => setOptedOut(!hasClientAnalyticsConsent());
    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    window.addEventListener(CONSENT_RESET_EVENT, sync);
    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener(CONSENT_RESET_EVENT, sync);
    };
  }, []);

  if (optedOut) {
    return (
      <span className={className} data-analytics-opt-out="done">
        {optedOutLabel}
      </span>
    );
  }

  return (
    <button
      type="button"
      data-analytics-opt-out="button"
      className={cn(
        "text-left underline-offset-4 hover:underline",
        className,
      )}
      onClick={() => persistAnalyticsOptOut()}
    >
      {label}
    </button>
  );
}
