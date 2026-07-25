"use client";

import React, { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { fr, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Trade } from "@/prisma/generated/prisma/browser";
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar";
import { Charts } from "./charts";
import { useI18n, useCurrentLocale } from "@/locales/client";
import { DailyStats } from "./daily-stats";
import { DailyComment } from "./daily-comment";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUserStore } from "../../../../../store/user-store";
import { TradeTableReview } from "../tables/trade-table-review";
import StatisticsWidget from "../statistics/statistics-widget";

interface CalendarModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  dayData: CalendarEntry | undefined;
  isLoading: boolean;
}

interface DailyTabsProps {
  selectedDate: Date;
  dayData: CalendarEntry | undefined;
  isLoading: boolean;
  layout: "dialog" | "drawer";
}

const formatSignedCurrency = (value: number) => {
  const formatted = Math.abs(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `-${formatted}` : `+${formatted}`;
};

function DailyTabs({ selectedDate, dayData, isLoading, layout }: DailyTabsProps) {
  const t = useI18n();
  const isDrawer = layout === "drawer";
  // On mobile the drawer should be glanceable first: land on the read-only
  // analysis tab instead of opening straight into the journal editor.
  const [activeTab, setActiveTab] = useState(isDrawer ? "analysis" : "comment");

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex-1 flex flex-col overflow-hidden min-h-0"
    >
      <TabsList
        className={cn(
          "shrink-0",
          isDrawer ? "mx-4 grid w-auto grid-cols-3" : "px-6",
        )}
      >
        <TabsTrigger value="comment">{t("calendar.modal.comment")}</TabsTrigger>
        <TabsTrigger value="table">{t("calendar.modal.table")}</TabsTrigger>
        <TabsTrigger value="analysis">
          {t("calendar.modal.analysis")}
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="comment"
        className={cn(
          "flex-1 overflow-hidden flex flex-col min-h-0",
          isDrawer ? "px-4 pt-2 pb-4" : "p-6 pt-2",
        )}
        data-vaul-no-drag
      >
        <DailyComment dayData={dayData} selectedDate={selectedDate} />
      </TabsContent>
      <TabsContent
        value="table"
        className="flex-1 overflow-hidden flex flex-col min-h-0"
        data-vaul-no-drag
      >
        {dayData && dayData.trades?.length > 0 ? (
          <div className="h-full w-full overflow-hidden">
            <TradeTableReview tradesParam={dayData.trades as Trade[]} />
          </div>
        ) : (
          <p className={cn(isDrawer ? "px-4 pt-2" : "p-6 pt-2")}>
            {t("calendar.modal.noTrades")}
          </p>
        )}
      </TabsContent>
      <TabsContent
        value="analysis"
        className={cn(
          "flex-1 overflow-y-auto overscroll-contain space-y-4 min-h-0",
          isDrawer ? "px-4 pt-2 pb-6" : "p-6 pt-2",
        )}
        data-vaul-no-drag
      >
        {dayData && dayData.trades?.length > 0 && (
          <StatisticsWidget dayData={dayData} size="medium" />
        )}
        <DailyStats dayData={dayData} isWeekly={false} />
        {/* <DailyMood dayData={dayData} isWeekly={false} selectedDate={selectedDate} /> */}
        <Charts dayData={dayData} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  );
}

export function CalendarModal({
  isOpen,
  onOpenChange,
  selectedDate,
  dayData,
  isLoading,
}: CalendarModalProps) {
  const t = useI18n();
  const locale = useCurrentLocale();
  const timezone = useUserStore((state) => state.timezone);
  const dateLocale = locale === "fr" ? fr : enUS;
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [formattedDate, setFormattedDate] = useState<string>("");

  React.useEffect(() => {
    if (selectedDate) {
      setFormattedDate(
        formatInTimeZone(selectedDate, timezone, "MMMM d, yyyy", {
          locale: dateLocale,
        }),
      );
    }
  }, [selectedDate, timezone, dateLocale]);

  if (!selectedDate) return null;

  if (!isDesktop) {
    const tradeCount = dayData?.tradeNumber ?? 0;

    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85dvh] max-h-[85dvh] p-0 flex flex-col">
          <DrawerHeader className="shrink-0 px-4 pt-3 pb-2 text-left">
            <div className="flex items-baseline justify-between gap-3">
              <DrawerTitle className="text-base capitalize truncate">
                {formattedDate}
              </DrawerTitle>
              {dayData && (
                <span
                  className={cn(
                    "text-sm font-semibold shrink-0",
                    dayData.pnl >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatSignedCurrency(dayData.pnl)}
                </span>
              )}
            </div>
            <DrawerDescription className="text-xs">
              {tradeCount > 0
                ? `${tradeCount} ${tradeCount > 1 ? t("calendar.trades") : t("calendar.trade")}`
                : t("calendar.modal.noTrades")}
            </DrawerDescription>
          </DrawerHeader>
          <DailyTabs
            selectedDate={selectedDate}
            dayData={dayData}
            isLoading={isLoading}
            layout="drawer"
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{formattedDate}</DialogTitle>
          <DialogDescription>
            {t("calendar.modal.tradeDetails")}
          </DialogDescription>
        </DialogHeader>
        <DailyTabs
          selectedDate={selectedDate}
          dayData={dayData}
          isLoading={isLoading}
          layout="dialog"
        />
      </DialogContent>
    </Dialog>
  );
}
