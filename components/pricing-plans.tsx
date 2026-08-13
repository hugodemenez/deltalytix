"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle } from "lucide-react";
import { useCurrentLocale, useI18n } from "@/locales/client";
import NumberFlow from "@number-flow/react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBillingCurrency } from "@/hooks/use-billing-currency";
import {
  PLUS_PLAN_PRICES,
  availableBillingPeriods,
  billingLookupKey,
  billingPeriodAvailability,
  formatBillingAmount,
  isLifetimeSubscription,
  type BillingPeriod,
} from "@/lib/billing-plan-catalog";
import {
  changeBillingPlan,
  submitBillingCheckout,
} from "@/lib/billing-plan-change.client";

type Plan = {
  name: string;
  description: string;
  price: Record<BillingPeriod, number>;
  features: string[];
  isPopular?: boolean;
  isComingSoon?: boolean;
};

type Plans = {
  [key: string]: Plan;
};

interface PricingPlansProps {
  isModal?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
  currentSubscription?: {
    id: string;
    status: string;
    plan: {
      id: string;
      name: string;
      interval: string;
    };
  } | null;
}

export default function PricingPlans({
  isModal,
  onClose,
  trigger,
  currentSubscription,
}: PricingPlansProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [showLifetimeConfirm, setShowLifetimeConfirm] = useState(false);
  const [pendingLookupKey, setPendingLookupKey] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const t = useI18n();
  const locale = useCurrentLocale();
  const { currency, symbol } = useBillingCurrency();

  // Read referral code from URL params or localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("@/lib/referral-storage").then(({ getReferralCode }) => {
        const ref = getReferralCode();
        if (ref) {
          setReferralCode(ref);
        }
      });
    }
  }, []);

  const periods = useMemo(
    () => availableBillingPeriods(currentSubscription ?? null),
    [currentSubscription],
  );
  const lifetimeOwned = isLifetimeSubscription(currentSubscription ?? null);
  const effectivePeriod = periods.includes(billingPeriod)
    ? billingPeriod
    : (periods[0] ?? "yearly");

  // Compatibility wrappers keep full pricing behavior on the shared catalog.
  const isCurrentPlan = (lookupKey: string) => {
    const period = lookupKey.split("_")[1] as BillingPeriod;
    return (
      billingPeriodAvailability(period, currentSubscription ?? null) ===
      "current"
    );
  };

  const hasLifetimeSubscription = () => {
    return isLifetimeSubscription(currentSubscription ?? null);
  };

  // Function to check if user should be blocked from subscribing to recurring plans
  const isBlockedFromRecurring = (lookupKey: string) => {
    if (!hasLifetimeSubscription()) return false;

    const parts = lookupKey.split("_");
    const interval = parts[1]; // "yearly", "monthly", etc.

    // Block recurring plans if user has lifetime
    return ["yearly", "monthly", "quarterly"].includes(interval);
  };

  // Function to check if user should be blocked from purchasing lifetime again
  const isBlockedFromLifetime = (lookupKey: string) => {
    if (!hasLifetimeSubscription()) return false;

    const parts = lookupKey.split("_");
    const interval = parts[1]; // "yearly", "monthly", etc.

    // Block lifetime plans if user already has lifetime
    return interval === "lifetime";
  };

  // Function to handle plan switching
  const handlePlanSwitch = async (lookupKey: string) => {
    if (!currentSubscription) {
      submitBillingCheckout(lookupKey, referralCode);
      return;
    }

    // Check if trying to switch to the same plan
    if (isCurrentPlan(lookupKey)) {
      toast.error(t("billing.error"), {
        description: t("billing.alreadyOnPlan"),
      });
      return;
    }

    // Check if user has lifetime and is trying to switch to recurring plan
    if (isBlockedFromRecurring(lookupKey)) {
      toast.error(t("billing.error"), {
        description: t("billing.lifetimeNoDowngrade"),
      });
      return;
    }

    // Check if user already has lifetime and is trying to purchase lifetime again
    if (isBlockedFromLifetime(lookupKey)) {
      toast.error(t("billing.error"), {
        description: t("billing.lifetimeAlreadyOwned"),
      });
      return;
    }

    // Check if this is a lifetime plan - show confirmation dialog
    if (lookupKey.includes("lifetime")) {
      setPendingLookupKey(lookupKey);
      setShowLifetimeConfirm(true);
      return;
    }

    await executePlanSwitch(lookupKey);
  };

  // Function to execute the actual plan switch
  const executePlanSwitch = async (lookupKey: string) => {
    setIsLoading(true);

    try {
      const result = await changeBillingPlan({
        lookupKey,
        hasSubscription: Boolean(currentSubscription),
        referralCode,
      });

      if (result.status === "switched") {
        toast.success(t("billing.planSwitched"), {
          description: t("billing.planSwitchedDescription"),
        });

        // Refresh the page to update subscription data
        window.location.reload();
      } else if (result.status === "error") {
        toast.error(t("billing.error"), {
          description: result.error,
        });
      }
    } catch {
      toast.error(t("billing.error"), {
        description: t("billing.planSwitchError"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle lifetime confirmation
  const handleLifetimeConfirm = async () => {
    setShowLifetimeConfirm(false);
    await executePlanSwitch(pendingLookupKey);
  };

  const plans: Plans = {
    basic: {
      name: t("pricing.basic.name"),
      description: t("pricing.basic.description"),
      price: { yearly: 0, quarterly: 0, monthly: 0, lifetime: 0 },
      features: [
        t("pricing.basic.feature1"),
        t("pricing.basic.feature2"),
        t("pricing.basic.feature3"),
        t("pricing.basic.feature6"),
        t("pricing.basic.feature7"),
        t("pricing.basic.feature8"),
        t("pricing.basic.feature9"),
        t("pricing.basic.feature10"),
        t("pricing.basic.feature11"),
        t("pricing.basic.feature12"),
      ],
    },
    plus: {
      name: t("pricing.plus.name"),
      description: t("pricing.plus.description"),
      price: PLUS_PLAN_PRICES,
      isPopular: true,
      features: [
        t("pricing.plus.feature1"),
        t("pricing.plus.feature2"),
        t("pricing.plus.feature6"),
      ],
    },
  };

  const freePlan = (
    <article className="flex min-h-[500px] min-w-0 flex-col rounded-sm bg-white p-5 dark:bg-black sm:p-6">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-2xl font-normal tracking-tight">
            {plans.basic.name}
          </h3>
          <span className="text-2xl font-normal tabular-nums">
            {t("pricing.free.name")}
          </span>
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-black/55 dark:text-white/55">
          {plans.basic.description}
        </p>
      </div>

      <div className="mt-10">
        <p className="mb-4 text-sm font-medium">{t("pricing.includes")}:</p>
        <ul className="space-y-3">
          {plans.basic.features.slice(0, 3).map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm leading-relaxed"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-10">
        {isModal ? (
          <Button onClick={onClose} className="h-11 w-full rounded-sm active:scale-[0.96]">
            {t("pricing.keepBasic")}
          </Button>
        ) : (
          <Button asChild className="h-11 w-full rounded-sm active:scale-[0.96]">
            <Link href="/authentication">
              {t("pricing.startBasic")} <span className="ml-2">→</span>
            </Link>
          </Button>
        )}
        <p className="mt-3 text-center text-[11px] leading-relaxed text-black/45 dark:text-white/45">
          {t("terms.pricing.freePlanDisclaimer")}
          <Link href="/terms" className="underline underline-offset-2">
            {t("terms.pricing.termsOfService")}
          </Link>
        </p>
      </div>
    </article>
  );

  const currentPricing =
    effectivePeriod === "yearly"
      ? plans.plus.price.yearly / 12
      : effectivePeriod === "quarterly"
        ? plans.plus.price.quarterly / 3
        : effectivePeriod === "lifetime"
          ? plans.plus.price.lifetime
          : plans.plus.price.yearly / 12;

  const billingDetail =
    effectivePeriod === "yearly"
      ? t("pricing.billedYearly", {
          total: formatBillingAmount(
            plans.plus.price.yearly,
            currency,
            locale,
          ),
        })
      : effectivePeriod === "quarterly"
        ? t("pricing.billedQuarterly", {
          total: formatBillingAmount(
              plans.plus.price.quarterly,
              currency,
              locale,
            ),
          })
        : effectivePeriod === "lifetime"
          ? t("pricing.oneTimePayment")
          : "\u00A0";

  const billingPeriodSelector = periods.length > 0 ? (
    <div className="grid w-full grid-cols-3 gap-1 rounded-sm bg-black/5 p-1 dark:bg-white/5">
      {periods.map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => setBillingPeriod(period)}
          className={cn(
            "min-w-0 rounded-sm px-3 py-2 text-xs capitalize transition-colors duration-150 ease-out sm:px-4",
            effectivePeriod === period
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white",
          )}
        >
          {t(`pricing.${period}` as "pricing.yearly")}
        </button>
      ))}
    </div>
  ) : null;

  const plusPlan = (
    <article className="flex min-h-[500px] min-w-0 flex-col rounded-sm bg-white p-5 dark:bg-black sm:p-6">
      {billingPeriodSelector ? (
        <div className="mb-6 md:hidden">
          <p className="mb-2 text-xs font-medium text-black/55 dark:text-white/55">
            {t("pricing.billingPeriod")}
          </p>
          {billingPeriodSelector}
        </div>
      ) : null}
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-2xl font-normal tracking-tight">
            {plans.plus.name}
          </h3>
          <div className="flex min-w-[11rem] shrink-0 items-baseline justify-end sm:min-w-[12rem]">
            <span className="text-2xl font-normal tabular-nums">
              <NumberFlow
                prefix={currency === "EUR" ? undefined : symbol}
                suffix={currency === "EUR" ? symbol : undefined}
                value={currentPricing}
                digits={{ 1: { max: 2 } }}
              />
            </span>
            <span
              className={cn(
                "ml-1 text-sm text-black/55 dark:text-white/55",
                effectivePeriod === "lifetime" && "invisible",
              )}
            >
              / {t("pricing.month")}
            </span>
          </div>
        </div>
        <p
          className="mt-2 h-4 w-full overflow-hidden text-ellipsis whitespace-nowrap text-right text-xs text-black/55 dark:text-white/55"
        >
          {billingDetail}
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-black/55 dark:text-white/55">
          {plans.plus.description}
        </p>
      </div>

      <div className="mt-10">
        <p className="mb-4 text-sm font-medium">{t("pricing.fullVersion")}:</p>
        <ul className="space-y-3">
          {plans.plus.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm leading-relaxed"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-10">
        <div
          className={cn(
            "mb-4 space-y-1 border-t border-black/10 pt-3 text-[11px] leading-relaxed text-black/45 dark:border-white/10 dark:text-white/45",
            effectivePeriod !== "lifetime" && "invisible",
          )}
          aria-hidden={effectivePeriod !== "lifetime"}
        >
          <p>• {t("pricing.lifetimeDisclaimer1")}</p>
          <p>• {t("pricing.lifetimeDisclaimer2")}</p>
        </div>
        <div>
          {(() => {
            const lookupKey = billingLookupKey(effectivePeriod, currency);
            const isCurrent = isCurrentPlan(lookupKey);
            const isBlockedRecurring = isBlockedFromRecurring(lookupKey);
            const isBlockedLifetime = isBlockedFromLifetime(lookupKey);
            const isBlocked =
              lifetimeOwned || isBlockedRecurring || isBlockedLifetime;
            const periodLabel =
              effectivePeriod === "lifetime"
                ? t("pricing.lifetime")
                : effectivePeriod === "yearly"
                  ? t("pricing.yearly")
                  : t("pricing.quarterly");

            return (
              <Button
                onClick={() => handlePlanSwitch(lookupKey)}
                disabled={
                  isLoading ||
                  isCurrent ||
                  isBlocked ||
                  periods.length === 0
                }
                variant={isCurrent || isBlocked ? "outline" : "default"}
                className="h-11 w-full rounded-sm active:scale-[0.96]"
              >
                {isLoading
                  ? effectivePeriod === "lifetime"
                    ? t("billing.lifetimeUpgrade")
                    : t("billing.switching")
                  : lifetimeOwned || isBlockedLifetime
                    ? t("billing.lifetimeOwned")
                    : isCurrent
                      ? t("billing.currentPlan")
                      : isBlockedRecurring
                        ? t("billing.lifetimeActive")
                        : currentSubscription
                          ? t("dashboard.billingPage.switchToPeriod", {
                              period: periodLabel,
                            })
                          : t("dashboard.billingPage.upgradeWithPlus")}
              </Button>
            );
          })()}

          <p className="mt-3 text-center text-[11px] leading-relaxed text-black/45 dark:text-white/45">
            {t("terms.pricing.disclaimer")}
            <Link href="/terms" className="underline underline-offset-2">
              {t("terms.pricing.termsOfService")}
            </Link>
          </p>
        </div>
      </div>
    </article>
  );

  const pricingContent = (
    <div>
      <div className="mx-auto mb-7 hidden max-w-xl justify-center md:flex">
        {billingPeriodSelector}
      </div>
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-2">
        {freePlan}
        {plusPlan}
      </div>

      {/* Lifetime Confirmation Dialog */}
      <Dialog open={showLifetimeConfirm} onOpenChange={setShowLifetimeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pricing.lifetimeUpgrade.title")}</DialogTitle>
            <DialogDescription>
              {t("pricing.lifetimeUpgrade.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {t("pricing.lifetimeUpgrade.warning")}
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                    <li>
                      {t("pricing.lifetimeUpgrade.warningPoints.currentPlan")}
                    </li>
                    <li>
                      {t(
                        "pricing.lifetimeUpgrade.warningPoints.immediateCancel",
                      )}
                    </li>
                    <li>
                      {t(
                        "pricing.lifetimeUpgrade.warningPoints.oneTimePayment",
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {currentSubscription && (
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium mb-2">
                  {t("pricing.lifetimeUpgrade.currentSubscription")}
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>{t("billing.currentPlan")}:</strong>{" "}
                    {currentSubscription.plan.name}
                  </p>
                  <p>
                    <strong>{t("billing.billingPeriod")}:</strong>{" "}
                    {currentSubscription.plan.interval}
                  </p>
                  <p>
                    <strong>{t("billing.status.active")}:</strong>{" "}
                    {t("billing.status.active")}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLifetimeConfirm(false)}
              disabled={isLoading}
            >
              {t("pricing.lifetimeUpgrade.cancel")}
            </Button>
            <Button onClick={handleLifetimeConfirm} disabled={isLoading}>
              {isLoading
                ? t("billing.lifetimeUpgrade")
                : t("pricing.lifetimeUpgrade.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (trigger) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          {pricingContent}
        </DialogContent>
      </Dialog>
    );
  }

  return pricingContent;
}
