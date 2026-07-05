import { safeTranslate } from "@/lib/translation-utils"
import { WidgetType } from "../types/dashboard"

const WIDGET_TYPE_LABEL_KEYS: Record<WidgetType, string> = {
  calendarWidget: "widgets.types.calendarView",
  equityChart: "widgets.types.equityChart",
  pnlChart: "widgets.types.pnlChart",
  timeOfDayChart: "widgets.types.timeOfDay",
  timeInPositionChart: "widgets.types.timeInPosition",
  weekdayPnlChart: "widgets.types.weekdayPnl",
  pnlBySideChart: "widgets.types.pnlBySide",
  pnlPerContractChart: "widgets.types.pnlPerContract",
  pnlPerContractDailyChart: "widgets.types.pnlPerContractDaily",
  tickDistribution: "widgets.types.tickDistribution",
  dailyTickTarget: "widgets.types.dailyTickTarget",
  commissionsPnl: "widgets.types.commissionsPnl",
  averagePositionTime: "widgets.types.averagePositionTime",
  cumulativePnl: "widgets.types.cumulativePnl",
  longShortPerformance: "widgets.types.longShortPerformance",
  tradePerformance: "widgets.types.tradePerformance",
  winningStreak: "widgets.types.winningStreak",
  profitFactor: "widgets.types.profitFactor",
  statisticsWidget: "widgets.types.statisticsOverview",
  tradeTableReview: "widgets.types.tradeReviewTable",
  chatWidget: "widgets.types.chat",
  tradeDistribution: "widgets.types.tradeDistribution",
  propFirm: "widgets.types.propFirm",
  timeRangePerformance: "widgets.types.timeRangePerformance",
  tagWidget: "widgets.types.tagWidget",
  riskRewardRatio: "widgets.types.riskRewardRatio",
  mindsetWidget: "widgets.types.mindsetWidget",
}

export function getWidgetDisplayName(t: Parameters<typeof safeTranslate>[0], type: WidgetType): string {
  return safeTranslate(t, WIDGET_TYPE_LABEL_KEYS[type])
}
