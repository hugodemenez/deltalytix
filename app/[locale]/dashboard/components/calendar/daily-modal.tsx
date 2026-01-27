"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, parsePositionTime } from "@/lib/utils";
import { Trade } from "@/prisma/generated/prisma/browser";
import { CalendarEntry } from "@/app/[locale]/dashboard/types/calendar";
import { Charts } from "./charts";
import { useI18n, useCurrentLocale } from "@/locales/client";
import { DailyStats } from "./daily-stats";
import { DailyComment } from "./daily-comment";
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

interface GroupedTrades {
  [accountNumber: string]: Trade[];
}

function groupTradesByAccount(trades: Trade[]): GroupedTrades {
  return trades.reduce((acc: GroupedTrades, trade) => {
    const account = trade.accountNumber || "Unknown Account";
    if (!acc[account]) {
      acc[account] = [];
    }
    acc[account].push(trade);
    return acc;
  }, {});
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
  const [activeTab, setActiveTab] = useState("comment");
  const [formattedDate, setFormattedDate] = useState<string>("");

  React.useEffect(() => {
    if (selectedDate) {
      setFormattedDate(
        format(selectedDate, "MMMM d, yyyy", { locale: dateLocale }),
      );
    }
  }, [selectedDate]);

  if (!selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-dvh sm:h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{formattedDate}</DialogTitle>
          <DialogDescription>
            {t("calendar.modal.tradeDetails")}
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="grow flex flex-col overflow-hidden"
        >
          <TabsList className="px-6">
            <TabsTrigger value="comment">
              {t("calendar.modal.comment")}
            </TabsTrigger>
            <TabsTrigger value="table">{t("calendar.modal.table")}</TabsTrigger>
            <TabsTrigger value="analysis">
              {t("calendar.modal.analysis")}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="comment"
            className="grow overflow-hidden p-6 pt-2 h-full flex flex-col"
          >
            <DailyComment dayData={dayData} selectedDate={selectedDate} />
          </TabsContent>
          <TabsContent
            value="table"
            className="grow overflow-hidden flex flex-col min-h-0"
          >
            {dayData && dayData.trades?.length > 0 ? (
              <div className="h-full w-full overflow-hidden">
                <TradeTableReview tradesParam={dayData.trades as Trade[]} />
              </div>
            ) : (
              <p className="p-6 pt-2">{t("calendar.modal.noTrades")}</p>
            )}
          </TabsContent>
          <TabsContent
            value="analysis"
            className="grow overflow-auto p-6 pt-2 space-y-4"
          >
            {dayData && dayData.trades?.length > 0 && (
              <StatisticsWidget dayData={dayData} size="medium" />
            )}
            <DailyStats dayData={dayData} isWeekly={false} />
            {/* <DailyMood dayData={dayData} isWeekly={false} selectedDate={selectedDate} /> */}
            <Charts dayData={dayData} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
