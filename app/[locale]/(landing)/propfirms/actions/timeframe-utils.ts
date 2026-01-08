export type Timeframe = 'currentMonth' | 'last3Months' | 'last6Months' | '2024' | '2025' | 'allTime'

export interface DateRange {
  startDate: Date
  endDate: Date
}

export function getTimeframeDateRange(timeframe: Timeframe): DateRange {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (timeframe) {
    case 'currentMonth': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return {
        startDate: startOfMonth,
        endDate: endOfMonth,
      }
    }
    case 'last3Months': {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return {
        startDate,
        endDate,
      }
    }
    case 'last6Months': {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return {
        startDate,
        endDate,
      }
    }
    case '2024': {
      return {
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 11, 31, 23, 59, 59, 999),
      }
    }
    case '2025': {
      return {
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 11, 31, 23, 59, 59, 999),
      }
    }
    case 'allTime': {
      // Use a very early date to capture all time
      return {
        startDate: new Date(1970, 0, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      }
    }
    default:
      // Fallback to current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return {
        startDate: startOfMonth,
        endDate: endOfMonth,
      }
  }
}

