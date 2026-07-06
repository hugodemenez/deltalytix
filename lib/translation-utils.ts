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

const WEEKDAY_SHORT_LABELS: Record<string, Record<string, string>> = {
  en: {
    'calendar.weekdays.sun': 'Su',
    'calendar.weekdays.mon': 'Mo',
    'calendar.weekdays.tue': 'Tu',
    'calendar.weekdays.wed': 'We',
    'calendar.weekdays.thu': 'Th',
    'calendar.weekdays.fri': 'Fr',
    'calendar.weekdays.sat': 'Sa',
  },
  fr: {
    'calendar.weekdays.sun': 'Di',
    'calendar.weekdays.mon': 'Lu',
    'calendar.weekdays.tue': 'Ma',
    'calendar.weekdays.wed': 'Me',
    'calendar.weekdays.thu': 'Je',
    'calendar.weekdays.fri': 'Ve',
    'calendar.weekdays.sat': 'Sa',
  },
}

/**
 * Unambiguous two-letter weekday labels for mobile calendar headers.
 * Uses a static map to avoid pushing next-international locale types past TS limits.
 */
export function translateWeekdayShort(day: string, locale: string): string {
  const labels = WEEKDAY_SHORT_LABELS[locale] ?? WEEKDAY_SHORT_LABELS.en
  return labels[day] ?? day
}

/**
 * Translates Tradovate fee type keys safely
 */
export function translateTradovateFeeType(t: any, key: string): string {
  switch (key) {
    case 'commission':
      return t('tradovateSync.multiAccount.feeTypes.commission')
    case 'exchangeFee':
      return t('tradovateSync.multiAccount.feeTypes.exchangeFee')
    case 'clearingFee':
      return t('tradovateSync.multiAccount.feeTypes.clearingFee')
    case 'nfaFee':
      return t('tradovateSync.multiAccount.feeTypes.nfaFee')
    case 'brokerageFee':
      return t('tradovateSync.multiAccount.feeTypes.brokerageFee')
    case 'orderRoutingFee':
      return t('tradovateSync.multiAccount.feeTypes.orderRoutingFee')
    default:
      return key
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
