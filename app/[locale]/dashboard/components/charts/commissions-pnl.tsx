"use client";

import * as React from "react";
import { useData } from "@/context/data-provider";
import { WidgetSize } from "@/app/[locale]/dashboard/types/dashboard";
import { useI18n } from "@/locales/client";
import { UnitFieldLoadingSkeleton } from "./chart-loading-skeleton";
import { shareConclusion } from "./chart-conclusions";
import { ChartWidgetFrame } from "./chart-widget-frame";
import { UnitDotField } from "./chart-unit-field";

interface CommissionsPnLChartProps {
  size?: WidgetSize;
}

const PNL_COLOR = "hsl(var(--chart-win))";
const COMMISSIONS_COLOR = "hsl(var(--chart-loss))";

export default function CommissionsPnLChart({
  size = "medium",
}: CommissionsPnLChartProps) {
  const { formattedTrades: trades, isLoading } = useData();
  const t = useI18n();

  const { groups, conclusion } = React.useMemo(() => {
    const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalCommissions = trades.reduce(
      (sum, trade) => sum + trade.commission,
      0,
    );
    const total = Math.abs(totalPnL) + Math.abs(totalCommissions);
    return {
      groups: [
        {
          key: "pnl",
          label: t("commissions.legend.netPnl"),
          color: PNL_COLOR,
          count: Math.abs(totalPnL),
        },
        {
          key: "commissions",
          label: t("commissions.legend.commissions"),
          color: COMMISSIONS_COLOR,
          count: Math.abs(totalCommissions),
        },
      ],
      conclusion: shareConclusion(Math.abs(totalCommissions), total),
    };
  }, [trades, t]);

  const subtitle =
    conclusion.kind === "empty"
      ? t("commissions.subtitle.empty")
      : t("commissions.subtitle.share", { percent: conclusion.percent });

  return (
    <ChartWidgetFrame
      size={size}
      title={t("commissions.title")}
      subtitle={subtitle}
      description={t("commissions.tooltip.description")}
    >
      {isLoading ? (
        <UnitFieldLoadingSkeleton size={size} />
      ) : (
        <UnitDotField
          groups={groups}
          mode="percent"
          label={subtitle}
          size={size}
        />
      )}
    </ChartWidgetFrame>
  );
}
