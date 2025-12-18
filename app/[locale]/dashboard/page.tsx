"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradeTableReview } from "./components/tables/trade-table-review";
import { AccountsOverview } from "./components/accounts/accounts-overview";
import { AnalysisOverview } from "./components/analysis/analysis-overview";
import WidgetCanvas from "./components/widget-canvas";
import { useEffect, useRef } from "react";
import { useI18n } from "@/locales/client";
import { useSearchParams } from "next/navigation";
import { clearReferralCode } from "@/lib/referral-storage";

export default function Home() {
  const t = useI18n();
  const mainRef = useRef<HTMLElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  // Clear referral code after successful subscription
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
      // Clear referral code from localStorage after successful subscription
      clearReferralCode();
    }
  }, [searchParams]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const calculateHeight = () => {
      // Clear any pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Debounce the calculation to account for animations
      timeoutId = setTimeout(() => {
        // Get navbar height - it's sticky at the top
        const navbar = document.querySelector(
          'nav[class*="sticky"]'
        ) as HTMLElement;
        const navbarHeight = navbar?.offsetHeight || 96; // fallback to 96px

        // Get tabs list height (wrapper includes py-2 padding)
        const tabsList = tabsListRef.current;
        const tabsListHeight = tabsList?.offsetHeight || 0;

        // Calculate the actual bottom position of the fixed tabs wrapper
        // Tabs wrapper is positioned at: navbarHeight from top
        // Tabs wrapper bottom = navbarHeight + tabsListHeight
        const tabsWrapperBottom = navbarHeight + tabsListHeight;

        // Get main element's top position to calculate relative padding
        const main = mainRef.current;
        const mainTop = main?.getBoundingClientRect().top || 0;

        // Calculate padding-top needed: tabs wrapper bottom - main top
        // This ensures content starts right after the tabs wrapper
        const calculatedPaddingTop = tabsWrapperBottom - mainTop;

        // Set CSS custom property for navbar height
        document.documentElement.style.setProperty(
          "--navbar-height",
          `${navbarHeight}px`
        );
        document.documentElement.style.setProperty(
          "--tabs-height",
          `${tabsListHeight}px`
        );
        document.documentElement.style.setProperty(
          "--calculated-padding-top",
          `${calculatedPaddingTop}px`
        );
      }, 100); // Small delay to account for animation
    };

    // Calculate on mount
    calculateHeight();

    // Recalculate on window resize
    window.addEventListener("resize", calculateHeight);

    // Create a ResizeObserver to watch for navbar height changes (when filters appear/disappear)
    const resizeObserver = new ResizeObserver(calculateHeight);
    const navbar = document.querySelector('nav[class*="sticky"]');
    if (navbar) {
      resizeObserver.observe(navbar);
    }

    // Create a MutationObserver to watch for DOM changes when ActiveFilterTags appear/disappear
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check if filter tags were added or removed
        if (mutation.type === "childList") {
          const hasFilterTags =
            Array.from(mutation.addedNodes).some(
              (node) =>
                node.nodeType === Node.ELEMENT_NODE &&
                (node as Element).classList?.contains("border-t")
            ) ||
            Array.from(mutation.removedNodes).some(
              (node) =>
                node.nodeType === Node.ELEMENT_NODE &&
                (node as Element).classList?.contains("border-t")
            );

          if (hasFilterTags) {
            calculateHeight();
          }
        }
      });
    });

    // Observe the navbar for DOM changes
    if (navbar) {
      mutationObserver.observe(navbar, {
        childList: true,
        subtree: true,
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener("resize", calculateHeight);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <main ref={mainRef}>
      <Tabs defaultValue="widgets" className="w-full h-full">
        {/* Fixed TabsList positioned under navbar */}
        <div ref={tabsListRef} className="sticky bg-background border-b top-(--navbar-height) z-1">
          <TabsList className="w-full max-w-none">
            <TabsTrigger value="widgets">
              {t("dashboard.tabs.widgets")}
            </TabsTrigger>
            <TabsTrigger value="table">{t("dashboard.tabs.table")}</TabsTrigger>
            <TabsTrigger value="accounts">
              {t("dashboard.tabs.accounts")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="table" className="h-[calc(100vh-var(--navbar-height)-var(--tabs-height)-16px)] p-4">
          <TradeTableReview />
        </TabsContent>

        <TabsContent value="accounts" className="flex-1 mt-0">
          <AccountsOverview size="large" />
        </TabsContent>

        <TabsContent value="widgets" className="px-4">
          <WidgetCanvas />
        </TabsContent>
      </Tabs>
    </main>
  );
}
