"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBillingCurrency } from "@/hooks/use-billing-currency";
import { useBlackFridayDisplay } from "@/hooks/use-black-friday-display";
import { formatBillingAmount } from "@/lib/billing-plan-catalog";
import { formatBlackFridayUntil } from "@/lib/black-friday-promo";
import { localizeLandingHref } from "@/lib/landing-nav-paths";
import { LOCALES } from "@/lib/locales";
import { useCurrentLocale, useI18n } from "@/locales/landing-client";

function isPromoSurface(pathname: string): boolean {
  let path = pathname || "/";
  for (const locale of LOCALES) {
    const prefix = `/${locale}`;
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      path = path.slice(prefix.length) || "/";
      break;
    }
  }
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path === "/" || path === "/pricing";
}

export function BlackFridayBanner() {
  const pathname = usePathname();
  const display = useBlackFridayDisplay();
  const { currency } = useBillingCurrency();
  const locale = useCurrentLocale();
  const t = useI18n();

  if (!isPromoSurface(pathname) || !display) return null;

  const date = formatBlackFridayUntil(display.endsAt, locale);
  const lifetime = display.prices.lifetime?.[currency];
  const monthly = display.prices.monthly?.[currency];
  const quarterly = display.prices.quarterly?.[currency];
  const yearly = display.prices.yearly?.[currency];

  const label =
    display.phase === "lifetime"
      ? lifetime
        ? t("pricing.blackFriday.bannerLifetime", {
            sale: formatBillingAmount(lifetime.salePrice, currency, locale),
            list: formatBillingAmount(lifetime.listPrice, currency, locale),
            date,
          })
        : null
      : monthly && quarterly && yearly
        ? t("pricing.blackFriday.bannerPlans", {
            monthly: formatBillingAmount(monthly.salePrice, currency, locale),
            quarterly: formatBillingAmount(
              quarterly.salePrice,
              currency,
              locale,
            ),
            yearly: formatBillingAmount(yearly.salePrice, currency, locale),
            date,
          })
        : null;

  if (!label) return null;

  return (
    <Link
      href={localizeLandingHref(locale, "/pricing")}
      className="block bg-black px-4 py-1.5 text-center text-xs leading-4 text-pretty text-white transition-opacity hover:opacity-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white dark:bg-white dark:text-black dark:focus-visible:ring-black"
    >
      {label}
    </Link>
  );
}
