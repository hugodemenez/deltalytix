export const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
export const LOCALES = ['en', 'fr']

export const LABELS = {
  en: {
    acceptCookies: /accept all/i,
    import: /import/i,
    tableTab: /^table$/i,
    accountsTab: /^accounts$/i,
    widgetsTab: /^widgets$/i,
    showAll: /show all/i,
    calendarView: /calendar view/i,
    supportAssistant: /support assistant/i,
    chartsView: /^charts$/i,
    tableView: /^table$/i,
  },
  fr: {
    acceptCookies: /tout accepter/i,
    import: /importer/i,
    tableTab: /^tableau$/i,
    accountsTab: /^comptes$/i,
    widgetsTab: /^widgets$/i,
    showAll: /afficher tout/i,
    calendarView: /vue calendrier/i,
    supportAssistant: /assistant support/i,
    chartsView: /^graphiques$/i,
    tableView: /^tableau$/i,
  },
}

export const PLAYWRIGHT_LOCALE = {
  en: 'en-US',
  fr: 'fr-FR',
}
