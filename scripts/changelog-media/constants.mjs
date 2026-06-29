export const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
export const LOCALES = ['en', 'fr']

export const LABELS = {
  en: {
    acceptCookies: /accept all/i,
    import: /import/i,
    tableTab: /^table$/i,
    showAll: /show all/i,
    calendarView: /calendar view/i,
    supportAssistant: /support assistant/i,
  },
  fr: {
    acceptCookies: /tout accepter/i,
    import: /importer/i,
    tableTab: /^tableau$/i,
    showAll: /afficher tout/i,
    calendarView: /vue calendrier/i,
    supportAssistant: /assistant support/i,
  },
}

export const PLAYWRIGHT_LOCALE = {
  en: 'en-US',
  fr: 'fr-FR',
}
