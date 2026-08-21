"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { useCurrentLocale } from "@/locales/client";
import type { BillingCurrency } from "@/lib/billing-plan-catalog";

const EUROZONE_COUNTRIES = new Set([
  "AT",
  "BE",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
  "CH",
  "GP",
  "MQ",
  "GF",
  "RE",
  "YT",
  "PM",
  "BL",
  "MF",
  "NC",
  "PF",
  "WF",
  "TF",
]);

function readCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2
    ? parts.pop()?.split(";").shift() ?? null
    : null;
}

/**
 * Shared pricing currency detection used by both the full pricing UI and the
 * dashboard billing sheet. French overseas territories intentionally remain
 * in the existing EUR behavior to preserve the live lookup-key selection.
 */
export function useBillingCurrency() {
  const [currency, setCurrency] = useState<BillingCurrency>("USD");
  const locale = useCurrentLocale();

  const detectCurrency = useCallback(() => {
    const country = readCookie("user-country");
    if (country) {
      startTransition(() => {
        setCurrency(
          EUROZONE_COUNTRIES.has(country.toUpperCase()) ? "EUR" : "USD",
        );
      });
      return;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isEuropeanTimezone =
      timezone.startsWith("Europe/") ||
      [
        "Paris",
        "Berlin",
        "Madrid",
        "Rome",
        "Amsterdam",
        "Brussels",
        "Vienna",
      ].some((city) => timezone.includes(city));
    const isEuropeanLocale =
      /^(fr|de|es|it|nl|pt|el|fi|et|lv|lt|sl|sk|mt|cy)-/.test(locale);

    startTransition(() => {
      setCurrency(
        isEuropeanTimezone || isEuropeanLocale ? "EUR" : "USD",
      );
    });
  }, [locale]);

  useEffect(() => {
    detectCurrency();
  }, [detectCurrency]);

  return {
    currency,
    symbol: currency === "EUR" ? "€" : "$",
  };
}
