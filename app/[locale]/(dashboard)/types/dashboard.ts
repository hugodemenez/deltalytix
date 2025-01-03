export type WidgetType = 
  | 'equityChart'
  | 'pnlChart'
  | 'timeOfDayChart'
  | 'timeInPositionChart'
  | 'weekdayPnlChart'
  | 'pnlBySideChart'
  | 'tickDistribution'
  | 'commissionsPnl'
  | 'calendarWidget'
  | 'averagePositionTime'
  | 'cumulativePnl'
  | 'longShortPerformance'
  | 'tradePerformance'
  | 'winningStreak'
  | 'statisticsWidget'
  | 'tradeTableReview'
  | 'moodSelector'
  | 'chatWidget'
  | 'newsWidget';
export type WidgetSize = 'tiny' | 'small' | 'small-long' | 'medium' | 'large'
export type ChartSize = 'small' | 'small-long' | 'medium' | 'large'

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