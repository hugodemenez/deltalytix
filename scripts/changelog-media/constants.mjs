export const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
export const LOCALES = ['en', 'fr']

/** Retina multiplier for changelog screenshots (override with CHANGELOG_DEVICE_SCALE). */
export function resolveDeviceScaleFactor() {
  const raw = process.env.CHANGELOG_DEVICE_SCALE
  const parsed = raw ? Number(raw) : 2
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2
}

const DEVICE_SCALE = resolveDeviceScaleFactor()

const VIEWPORT_PRESETS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
}

/** Playwright context options for a named viewport preset. */
export function viewport(preset) {
  const size = VIEWPORT_PRESETS[preset]
  if (!size) throw new Error(`Unknown viewport preset: ${preset}`)
  const deviceScaleFactor = resolveDeviceScaleFactor()
  const base = {
    viewport: size,
    deviceScaleFactor,
  }
  if (preset === 'mobile') {
    return { ...base, isMobile: true, hasTouch: true }
  }
  return base
}

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
    accountsTableView: /^table$/i,
    featuresNav: /^features$/i,
    updatesNav: /^updates$/i,
    paymentHistory: /payment history/i,
    billing: /billing/i,
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
    accountsTableView: /^tableau$/i,
    featuresNav: /^fonctionnalités$/i,
    updatesNav: /^mises à jour$/i,
    paymentHistory: /historique des paiements/i,
    billing: /facturation/i,
  },
}

export const PLAYWRIGHT_LOCALE = {
  en: 'en-US',
  fr: 'fr-FR',
}

/** Demo invoices injected during billing-mobile captures (local bypass has no Stripe data). */
export const BILLING_CAPTURE_MOCK = {
  en: {
    paid: 'Paid',
    viewInvoice: 'View invoice',
    downloadPdf: 'Download PDF',
    invoices: [
      { amount: '€29.00', date: 'July 1, 2026' },
      { amount: '€29.00', date: 'June 1, 2026' },
      { amount: '€29.00', date: 'May 1, 2026' },
    ],
  },
  fr: {
    paid: 'Payé',
    viewInvoice: 'Voir la facture',
    downloadPdf: 'Télécharger le PDF',
    invoices: [
      { amount: '€29.00', date: '1 juillet 2026' },
      { amount: '€29.00', date: '1 juin 2026' },
      { amount: '€29.00', date: '1 mai 2026' },
    ],
  },
}
