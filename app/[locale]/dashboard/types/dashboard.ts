export type WidgetType = 
  | 'equityChart'
  | 'pnlChart'
  | 'timeOfDayChart'
  | 'timeInPositionChart'
  | 'weekdayPnlChart'
  | 'pnlBySideChart'
  | 'pnlPerContractChart'
  | 'pnlPerContractDailyChart'
  | 'tickDistribution'
  | 'dailyTickTarget'
  | 'commissionsPnl'
  | 'calendarWidget'
  | 'averagePositionTime'
  | 'cumulativePnl'
  | 'longShortPerformance'
  | 'tradePerformance'
  | 'winningStreak'
  | 'profitFactor'
  | 'statisticsWidget'
  | 'tradeTableReview'
  | 'chatWidget'
  | 'tradeDistribution'
  | 'propFirm'
  | 'timeRangePerformance'
  | 'tagWidget'
  | 'riskRewardRatio'
  | 'mindsetWidget'
  // | 'marketChart'
export type WidgetSize = 'tiny' | 'small' | 'small-long' | 'medium' | 'large' | 'extra-large'

export interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export interface Widget extends LayoutItem {
  type: WidgetType
  size: WidgetSize
  static?: boolean
}

export interface Layouts {
  desktop: Widget[]
  mobile: Widget[]
}

export interface LayoutState {
  layouts: Layouts
  activeLayout: 'desktop' | 'mobile'
} 