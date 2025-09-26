/**
 * Utility functions to handle complex union types in translations
 * This prevents TypeScript "Expression produces a union type that is too complex to represent" errors
 */

/**
 * Safely translates a key by using a type assertion that bypasses complex union type issues
 * Use this when you have a variable that contains a translation key and TypeScript complains
 * about complex union types.
 */
export function safeTranslate(t: any, key: string): string {
  return t(key as any)
}

/**
 * Translates weekday keys safely
 */
export function translateWeekday(t: any, day: string): string {
  switch (day) {
    case 'calendar.weekdays.sun': return t('calendar.weekdays.sun')
    case 'calendar.weekdays.mon': return t('calendar.weekdays.mon')
    case 'calendar.weekdays.tue': return t('calendar.weekdays.tue')
    case 'calendar.weekdays.wed': return t('calendar.weekdays.wed')
    case 'calendar.weekdays.thu': return t('calendar.weekdays.thu')
    case 'calendar.weekdays.fri': return t('calendar.weekdays.fri')
    case 'calendar.weekdays.sat': return t('calendar.weekdays.sat')
    default: return day
  }
}

/**
 * Translates weekday PnL keys safely
 */
export function translateWeekdayPnL(t: any, day: number): string {
  switch (day) {
    case 0: return t('weekdayPnl.days.sunday')
    case 1: return t('weekdayPnl.days.monday')
    case 2: return t('weekdayPnl.days.tuesday')
    case 3: return t('weekdayPnl.days.wednesday')
    case 4: return t('weekdayPnl.days.thursday')
    case 5: return t('weekdayPnl.days.friday')
    case 6: return t('weekdayPnl.days.saturday')
    default: return ''
  }
}
