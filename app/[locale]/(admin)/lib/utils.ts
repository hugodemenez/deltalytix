import { startOfWeek, startOfMonth, startOfYear } from 'date-fns'

export function aggregateDataByPeriod<T extends { date: string } & Record<Exclude<keyof T, 'date'>, number>>(
  data: T[],
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  valueKey: keyof T
) {
  const aggregatedData = data.reduce((acc, item) => {
    const date = new Date(item.date)
    let key: string

    switch (period) {
      case 'weekly':
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        key = weekStart.toISOString()
        break
      case 'monthly':
        key = startOfMonth(date).toISOString()
        break
      case 'yearly':
        key = startOfYear(date).toISOString()
        break
      default:
        key = item.date
    }

    if (!acc[key]) {
      acc[key] = {
        date: key,
        [valueKey]: 0
      } as T
    }
    acc[key][valueKey] = (acc[key][valueKey] as unknown as number) + (item[valueKey] as unknown as number) as T[keyof T]
    return acc
  }, {} as Record<string, T>)

  return Object.values(aggregatedData).sort((a, b) => a.date.localeCompare(b.date))
}

export function aggregateCombinedDataByPeriod(
  data: { date: string; users: number; trades: number }[],
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
) {
  const aggregatedData = data.reduce((acc, item) => {
    const date = new Date(item.date)
    let key: string

    switch (period) {
      case 'weekly':
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        key = weekStart.toISOString()
        break
      case 'monthly':
        key = startOfMonth(date).toISOString()
        break
      case 'yearly':
        key = startOfYear(date).toISOString()
        break
      default:
        key = item.date
    }

    if (!acc[key]) {
      acc[key] = {
        date: key,
        users: 0,
        trades: 0
      }
    }
    acc[key].users += item.users
    acc[key].trades += item.trades
    return acc
  }, {} as Record<string, { date: string; users: number; trades: number }>)

  return Object.values(aggregatedData).sort((a, b) => a.date.localeCompare(b.date))
} 