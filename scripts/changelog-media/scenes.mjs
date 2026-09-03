import fs from 'fs'
import path from 'path'

import {
  assertNoDevIssues,
  clickTab,
  clipAround,
  dismissCookies,
  ensureCookiesDismissed,
  injectBillingPaymentHistoryMock,
  newCapturePage,
  outputDir,
  recordVideo,
  screenshot,
  waitForDashboard,
  waitForNavbarBadgeSettled,
} from './helpers.mjs'
import { execFileSync } from 'child_process'
import { LABELS, resolveDeviceScaleFactor, viewport } from './constants.mjs'

/** Seeded standalone account the IG import capture targets. */
const CAPTURE_ACCOUNT = 'LOCAL-SIM-001'

/** Multi-trade IG export with one cash row and one fractional row, for capture only. */
const IG_CAPTURE_FIXTURE = path.join(
  process.cwd(),
  'scripts/changelog-media/fixtures/ig-transaction-history-capture.csv',
)

/** Current Rithmic Performance layout with Trade Date leading the trade row. */
const RITHMIC_PERFORMANCE_CAPTURE_FIXTURE = path.join(
  process.cwd(),
  'scripts/changelog-media/fixtures/rithmic-performance-trade-date-capture.csv',
)

/**
 * Query typed into the import picker search field. Narrows the list sharply
 * while still leaving more than one result, so the filtering is unmistakable.
 */
const IMPORT_PICKER_SEARCH_QUERY = 'rithmic'

const CAPTURE_LABELS = {
  en: {
    dxfeed: /^DxFeed$/i,
    ibkr: /Interactive Brokers/i,
    rithmicProtocol: /Rithmic Protocol/i,
    schedule: /Schedule sync/i,
    daily: /Once a day/i,
    features: /^Features\s*↓?$/i,
    equity: /^Equity$/i,
    individual: /^Individual$/i,
    supportRequest: /Fill out a support request through the form/i,
    connectionsStrip: /^Connections$/i,
    filtersAria: /^Filters$/i,
    accountsSection: /^Accounts$/i,
    selectAllAccounts: /^Select all accounts$/i,
    clearAll: /^Clear all$/i,
    weeklyRecap: /^Weekly recap$/i,
    deleteAccount: /^Delete account$/i,
    addChip: /^Add$/i,
    accountTrigger: /^Account$/,
    connectionsNav: /^Connections$/,
    standaloneChip: /Standalone/,
    mask: /^Mask$/,
    deleteStandalone: /^(Delete Local Simulation|Delete LOCAL-SIM-001)$/,
    deleteConfirmTitle: /^Delete this account\?$/,
    cancel: /^Cancel$/,
    compareJournalsHeading: /^Journals comparison$/,
    youAreHere: /You.?re here/,
    viewMore: /View more/,
    compareWhatYouGet: /WHAT YOU GET/,
    agentResources: /^For AI agents and crawlers$/,
    deepcharts: /DeepCharts/,
    platformCsv: /Platform CSV Import/,
  },
  fr: {
    dxfeed: /^DxFeed$/i,
    ibkr: /Interactive Brokers/i,
    rithmicProtocol: /Rithmic Protocol/i,
    schedule: /Planifier la sync/i,
    daily: /Une fois par jour/i,
    features: /^Fonctionnalités\s*↓?$/i,
    equity: /^Profits$/i,
    individual: /^Individuel$/i,
    supportRequest: /Remplir une demande de support via le formulaire/i,
    connectionsStrip: /^Connexions$/i,
    filtersAria: /^Filtres$/i,
    accountsSection: /^Comptes$/i,
    selectAllAccounts: /^Sélectionner tous les comptes$/i,
    clearAll: /^Tout effacer$/i,
    weeklyRecap: /^Récap hebdomadaire$/i,
    deleteAccount: /^Supprimer le compte$/i,
    addChip: /^Ajouter$/i,
    accountTrigger: /^Compte$/,
    connectionsNav: /^Connexions$/,
    standaloneChip: /Autonome/,
    mask: /^Masquer$/,
    deleteStandalone: /^(Supprimer Local Simulation|Supprimer LOCAL-SIM-001)$/,
    deleteConfirmTitle: /^Supprimer ce compte \?$/,
    cancel: /^Annuler$/,
    compareJournalsHeading: /^Comparaison des journaux$/,
    youAreHere: /Vous êtes ici/,
    viewMore: /Voir plus/,
    compareWhatYouGet: /Ce que vous avez/,
    agentResources: /^For AI agents and crawlers$/,
    deepcharts: /DeepCharts/,
    platformCsv: /Import CSV Plateforme/,
  },
}

/** Open Connections through the hydrated dashboard and settle transient UI. */
async function openConnections(page, locale, siteUrl) {
  // Enter through the hydrated dashboard. A direct French Connections request
  // can format seeded timestamps differently during SSR and client hydration.
  await page.goto(`${siteUrl}/${locale}/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  })
  await dismissCookies(page, locale)
  const nav = page.locator('nav a#import-data').first()
  await nav.waitFor({ timeout: 60_000 })
  await nav.click()
  await page.waitForFunction(
    () => window.location.pathname.includes('/dashboard/connections'),
    undefined,
    { timeout: 60_000 },
  )
  await page.getByRole('heading', { name: /^Connections$|^Connexions$/i }).waitFor({
    timeout: 60_000,
  })
  await page.getByRole('button', { name: LABELS[locale].addConnection }).waitFor({
    timeout: 60_000,
  })
  await page.locator('[data-sonner-toast]').first().waitFor({
    state: 'hidden',
    timeout: 15_000,
  }).catch(() => {})
}

/** Open a provider sheet from the real Add connection menu. */
async function openConnectionService(page, locale, siteUrl, servicePattern, formAnchor) {
  await openConnections(page, locale, siteUrl)
  await page.getByRole('button', { name: LABELS[locale].addConnection }).click()
  const menu = page.getByRole('menu').first()
  await menu.waitFor({ timeout: 15_000 })
  const item = menu.getByRole('menuitem').filter({ hasText: servicePattern }).first()
  await item.click()
  const anchor = page.locator(formAnchor)
  await anchor.waitFor({ timeout: 20_000 })
  const dialog = anchor.locator('xpath=ancestor::*[@role="dialog"][1]')
  await dialog.waitFor({ timeout: 20_000 })
  await page.waitForTimeout(1200)
  return dialog
}

/** Replace sensitive local fixture identifiers in the rendered DOM only. */
async function sanitizeConnectionIdentifiers(page) {
  await page.evaluate(() => {
    const replacements = [
      [/PP-000746/g, 'CAPTURE-RITHMIC-01'],
      [/PP-(?:CASH-)?F50K-000746-\d+/g, 'DEMO-RITHMIC-ACCOUNT'],
      [/PAAPEX\d+/g, 'DEMO-TRADOVATE-ACCOUNT'],
      [/DEMENEZ-CHALLENGE[^\s]*/g, 'DEMO-STANDALONE-001'],
      [/HD\d+/g, 'DEMO-STANDALONE-002'],
      [/DEMO4516628/g, 'DEMO-STANDALONE-003'],
    ]
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    for (const node of nodes) {
      let value = node.textContent ?? ''
      for (const [pattern, replacement] of replacements) {
        value = value.replace(pattern, replacement)
      }
      node.textContent = value
    }
  })
}

/** Ensure loading/error toasts cannot cover provider controls in evidence. */
async function waitForNoVisibleToasts(page) {
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('[data-sonner-toast]')).every((toast) => {
      const style = getComputedStyle(toast)
      const rect = toast.getBoundingClientRect()
      return style.visibility === 'hidden' || style.display === 'none' || rect.width === 0 || rect.height === 0
    }),
    undefined,
    { timeout: 90_000 },
  )
  await page.waitForTimeout(300)
}

/** Deterministic support conversation shown only for capture. */
async function injectSupportConversationFixture(page, locale, mode) {
  const copy = {
    en: {
      question: 'How does Deltalytix choose the nearest account line on the equity chart?',
      grepping: 'Searching the codebase...',
      reading: 'Reading documentation...',
      thought: 'Thought process',
      answer: 'The chart compares each account value with the pointer position for the active date. The closest line gets the active dot and moves to the top of the legend.',
      edit: 'Edit', cancel: 'Cancel', notice: 'Editing — replies after this message will be removed.',
    },
    fr: {
      question: "Comment Deltalytix choisit-il la courbe de compte la plus proche sur le graphique d'equity ?",
      grepping: 'Recherche dans le code source...',
      reading: 'Lecture de la documentation...',
      thought: 'Raisonnement',
      answer: "Le graphique compare la valeur de chaque compte à la position du pointeur pour la date active. La courbe la plus proche reçoit le point actif et passe en tête de la légende.",
      edit: 'Modifier', cancel: 'Annuler', notice: 'Modification en cours — les réponses suivantes seront supprimées.',
    },
  }[locale]

  await page.evaluate(({ copy, mode }) => {
    const form = document.querySelector('main form')
    if (!form) throw new Error('Support form not found for capture fixture')
    const host = form.parentElement
    const fixture = document.createElement('section')
    fixture.setAttribute('data-changelog-support-fixture', mode)
    fixture.className = 'mb-4 grid gap-3 rounded-sm border border-black/10 bg-white p-4 text-sm shadow-sm dark:border-white/10 dark:bg-black'
    fixture.innerHTML = mode === 'edit'
      ? `<div class="rounded-sm border border-black/20 p-3"><textarea aria-label="${copy.edit}" class="min-h-20 w-full resize-none rounded-sm border border-black/20 bg-transparent p-3 text-sm" spellcheck="false">${copy.question}</textarea><p class="mt-2 text-xs text-amber-700 dark:text-amber-300">${copy.notice}</p><div class="mt-3 flex justify-end gap-2"><button class="h-9 rounded-sm border border-black/20 px-3">${copy.cancel}</button><button class="h-9 rounded-sm bg-black px-3 text-white dark:bg-white dark:text-black">${copy.edit}</button></div></div><div class="opacity-35"><div class="rounded-sm bg-black/[0.04] p-3 dark:bg-white/[0.06]">${copy.answer}</div></div>`
      : `<div class="ml-auto max-w-[82%] rounded-sm bg-black px-4 py-3 text-white dark:bg-white dark:text-black">${copy.question}</div><div class="grid gap-2 rounded-sm border border-black/10 p-3 dark:border-white/10"><div class="flex items-center gap-2 text-xs text-black/55 dark:text-white/55"><span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>${copy.grepping}</div><div class="flex items-center gap-2 text-xs text-black/55 dark:text-white/55"><span class="inline-block h-2 w-2 rounded-full bg-blue-500"></span>${copy.reading}</div><details open class="rounded-sm bg-black/[0.04] p-3 dark:bg-white/[0.06]"><summary class="cursor-default text-xs font-medium">${copy.thought}</summary><p class="mt-2 text-xs text-black/55 dark:text-white/55">equity-chart.tsx · account-selection-popover.tsx</p></details><p class="leading-relaxed">${copy.answer}</p></div>`
    host.insertBefore(fixture, form)
  }, { copy, mode })
}

/** Render the safe post-email state without invoking an auth provider. */
async function injectAuthenticationEmailFixture(page, locale) {
  const copy = {
    en: { email: 'capture@example.test', open: 'Open Mailbox', resend: 'Resend in 42s', code: 'Verification Code', change: 'Use a different email' },
    fr: { email: 'capture@exemple.test', open: 'Ouvrir la Boîte Mail', resend: 'Renvoyer dans 42s', code: 'Code de Vérification', change: 'Utiliser une autre adresse' },
  }[locale]
  await page.evaluate((copy) => {
    const email = document.querySelector('#email')
    const formRoot = email?.closest('form')?.parentElement
    if (!formRoot) throw new Error('Authentication form not found for fixture')
    formRoot.innerHTML = `<div class="grid gap-6" data-changelog-auth-fixture><div class="grid gap-3"><div class="relative"><input disabled value="${copy.email}" class="flex h-11 w-full rounded-sm border border-black/10 bg-transparent px-3 pr-11 text-sm opacity-70"><button aria-label="${copy.change}" title="${copy.change}" class="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-sm text-black/55">←</button></div><div class="grid grid-cols-2 gap-3"><button class="h-11 rounded-sm border border-black/20 text-sm">✉ ${copy.open}</button><button disabled class="h-11 rounded-sm border border-black/20 text-sm opacity-60">${copy.resend}</button></div></div><div class="grid gap-3"><p class="text-center text-sm text-black/55 dark:text-white/55">${copy.code}</p><div class="flex justify-center gap-2"><span class="grid h-12 w-10 place-items-center rounded-sm border border-black/20"></span><span class="grid h-12 w-10 place-items-center rounded-sm border border-black/20"></span><span class="grid h-12 w-10 place-items-center rounded-sm border border-black/20"></span><span class="mx-1 self-center text-black/35">—</span><span class="grid h-12 w-10 place-items-center rounded-sm border border-black/20"></span><span class="grid h-12 w-10 place-items-center rounded-sm border border-black/20"></span><span class="grid h-12 w-10 place-items-center rounded-sm border border-black/20"></span></div></div><div class="relative py-2"><div class="border-t border-black/10"></div></div></div>`
  }, copy)
}

/**
 * The homepage contribution card refreshes through a server action after
 * paint. Changelog captures do not use that card, so block that POST to keep
 * external GitHub rate limits from creating a dev error overlay.
 */
async function blockLandingDataRefresh(page, locale, siteUrl) {
  const target = new URL(`/${locale}`, siteUrl).toString().replace(/\/$/, '')
  await page.route(`${target}**`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })
}

/**
 * Connections page, warmed enough for a clean capture: trades loaded, seeded
 * accounts rendered, sync toasts gone, and the navbar badge resolved.
 *
 * Reached by clicking the dashboard navbar link rather than a fresh document
 * load. `ConnectionRow` formats sync timestamps differently on the server and
 * the client, so server-rendering `/<locale>/dashboard/connections` trips the
 * dev hydration overlay in French. Navigating in-app keeps the capture on the
 * client render path without touching product code.
 */
async function openConnectionsForImport(page, locale, siteUrl) {
  await waitForDashboard(page, locale, siteUrl)
  // v5 chrome: Connections is in the Account menu, not a navbar #import-data link.
  await page
    .getByRole('button', { name: CAPTURE_LABELS[locale].accountTrigger })
    .click()
  await page
    .getByRole('menuitem', { name: CAPTURE_LABELS[locale].connectionsNav })
    .or(page.getByRole('link', { name: CAPTURE_LABELS[locale].connectionsNav }))
    .first()
    .click()
  await page.waitForURL(/\/dashboard\/connections/, { timeout: 60_000 })
  await dismissCookies(page, locale)
  await page.getByText(CAPTURE_ACCOUNT).first().waitFor({ timeout: 90_000 })
  await page
    .locator('[data-sonner-toast]')
    .first()
    .waitFor({ state: 'hidden', timeout: 20_000 })
    .catch(() => {})
  await waitForNavbarBadgeSettled(page)
  await ensureCookiesDismissed(page, locale)
}

/**
 * Open the file-import platform picker. Returns the page heading and trigger
 * alongside the popover so captures can be framed on the whole control.
 */
async function openImportPicker(page, locale) {
  const heading = page.getByRole('heading', { level: 1 }).first()
  const trigger = page
    .getByRole('button', { name: LABELS[locale].uploadFileImport })
    .first()
  await trigger.waitFor({ timeout: 30_000 })
  await trigger.click()
  const picker = page.locator('[cmdk-root]').first()
  await picker.waitFor({ timeout: 15_000 })
  await page.waitForTimeout(700)
  return { heading, trigger, picker }
}

/**
 * Open the dashboard connections-strip Standalone / Autonome chip picker.
 * Viewport/route: desktop /{locale}/dashboard (not the Connections page).
 * Seeded row is propfirm "Local Simulation" above number LOCAL-SIM-001.
 * Expected: Mask/Masquer eye and standalone Delete trash. Does not click
 * mask (persists Hidden Accounts) and does not confirm delete.
 */
async function openStandaloneStripPicker(page, locale, siteUrl) {
  await waitForDashboard(page, locale, siteUrl)
  const strip = page.getByRole('navigation', {
    name: CAPTURE_LABELS[locale].connectionsStrip,
  })
  await strip.waitFor({ timeout: 30_000 })
  await waitForNoVisibleToasts(page)
  const chip = strip.getByRole('button', {
    name: CAPTURE_LABELS[locale].standaloneChip,
  }).first()
  await chip.waitFor({ timeout: 15_000 })
  await chip.click()
  const picker = page.locator('[cmdk-root]').last()
  await picker.waitFor({ timeout: 15_000 })
  await page.getByText(CAPTURE_ACCOUNT, { exact: true }).first().waitFor({
    timeout: 15_000,
  })
  await page.getByRole('button', { name: CAPTURE_LABELS[locale].mask }).waitFor({
    timeout: 10_000,
  })
  await page
    .getByRole('button', { name: CAPTURE_LABELS[locale].deleteStandalone })
    .waitFor({ timeout: 10_000 })
  await page.waitForTimeout(600)
  return { strip, chip, picker }
}

/** Scroll the picker's own list so a named option is visible in the capture. */
async function revealPickerOption(page, name) {
  await page.evaluate((optionName) => {
    const list = document.querySelector('[cmdk-list]')
    const scroller = list?.querySelector('[cmdk-list-sizer]')?.parentElement ?? list
    const option = Array.from(document.querySelectorAll('[cmdk-item]')).find(
      (item) => (item.textContent ?? '').trim() === optionName,
    )
    if (!scroller || !option) return
    scroller.scrollTop = Math.max(
      0,
      option.offsetTop - scroller.clientHeight + option.offsetHeight + 8,
    )
  }, name)
  await page.waitForTimeout(600)
}

/** @typedef {'landing-hero' | 'landing-scroll' | 'landing-contribution-graph' | 'landing-contribution-graph-hover' | 'landing-ai-journaling-demo' | 'landing-features-carousel' | 'landing-navbar-updates' | 'landing-faq-expanded' | 'landing-faq-self-host' | 'landing-pricing-stability' | 'landing-features-transition' | 'import-mobile' | 'support' | 'trade-table-mobile' | 'trade-table-desktop' | 'trade-table-scroll-video' | 'calendar-widgets' | 'calendar-table' | 'accounts-mobile' | 'accounts-table-desktop' | 'widgets-mobile' | 'widgets-mobile-minimap' | 'billing-mobile' | 'connections-hub' | 'connections-import-picker' | 'connections-import-picker-search' | 'connections-ig-import-preview' | 'widget-info-popover-mobile' | 'feedback-popover' | 'update-og-image' | 'equity-nearest-line' | 'equity-account-selector' | 'dxfeed-firm-search' | 'dxfeed-credentials-step' | 'ibkr-read-only-guide' | 'ibkr-token-query-form' | 'mobile-form-focus-stability' | 'authentication-desktop' | 'authentication-email-code' | 'authentication-mobile' | 'support-source-investigation' | 'support-question-edit' | 'support-contact-form' | 'connection-sync-intervals' | 'connection-sync-daily' | 'connection-sync-mobile' | 'rithmic-system-search' | 'rithmic-credentials-step' | 'rithmic-performance-picker' | 'rithmic-performance-preview' | 'dashboard-shell-home' | 'dashboard-shell-filters' | 'settings-account-list' | 'dxfeed-single-step-form' | 'compare-hub-journals-table' | 'compare-tradezella-what-you-get' | 'connections-import-picker-deepcharts' | 'dashboard-strip-standalone-actions' | 'dashboard-strip-standalone-delete-confirm' | 'public-404-agent-resources' | 'calendar-header-month-year-news' | 'dashboard-centered-view-tabs' | 'dashboard-home-email' | 'renewal-notice-email'} ChangelogScene */


/**
 * @param {import('playwright-core').Browser} browser
 * @param {{ batch: string, locale: string, file: string, scene: ChangelogScene, route?: string, siteUrl: string, playwrightLocale: string }} options
 */
export async function captureScene(browser, options) {
  const { batch, locale, file, scene, route, siteUrl, playwrightLocale } = options

  switch (scene) {
    case 'landing-hero': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      await page.waitForTimeout(3000)
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} landing`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'landing-contribution-graph': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const section = page.locator('#open-source')
      await section.scrollIntoViewIfNeeded()
      await page.waitForTimeout(3000)
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} contribution graph`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'landing-contribution-graph-hover': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const section = page.locator('#open-source')
      await section.scrollIntoViewIfNeeded()
      await page.waitForTimeout(2000)
      const activeWeek = page.locator('.contribution-week-bar').filter({ hasNot: page.locator('.bg-muted\\/70') }).last()
      await activeWeek.scrollIntoViewIfNeeded()
      await activeWeek.hover({ force: true })
      await page.waitForSelector('[data-radix-popper-content-wrapper]', { timeout: 10_000 })
      await page.waitForTimeout(500)
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} contribution graph hover`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'landing-ai-journaling-demo': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await blockLandingDataRefresh(page, locale, siteUrl)
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const section = page.locator('#ai-journaling')
      await section.scrollIntoViewIfNeeded()
      await page.locator('[data-demo-stage]').waitFor({ timeout: 20_000 })
      await page.waitForFunction(
        () => document.querySelectorAll('[data-demo-turn]').length >= 2,
        undefined,
        { timeout: 30_000 },
      )
      await page.waitForTimeout(1000)
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} AI journaling demo`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'landing-features-carousel': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await blockLandingDataRefresh(page, locale, siteUrl)
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const section = page.locator('#performance-visualization')
      await section.scrollIntoViewIfNeeded()
      await page.waitForTimeout(4000)
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} landing features carousel`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'landing-navbar-updates': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const updatesTrigger = page.getByRole('button', { name: LABELS[locale].updatesNav })
      if ((await updatesTrigger.count()) > 0) {
        await updatesTrigger.first().click()
        await page.waitForTimeout(1200)
      }
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} landing navbar updates`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'landing-faq-expanded': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const section = page.locator('#faq')
      await section.scrollIntoViewIfNeeded()
      const firstQuestion = section.getByRole('button').first()
      await firstQuestion.click()
      await page.waitForTimeout(1200)
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} landing FAQ expanded`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'landing-faq-self-host': {
      // Desktop FAQ #faq: self-host question open with Open-with popover (Cursor/ChatGPT/Claude).
      const selfHostQuestion = {
        en: /is it possible to run deltalytix locally/i,
        fr: /est-il possible d'exécuter deltalytix localement/i,
      }
      const openWith = {
        en: /^open with$/i,
        fr: /^ouvrir avec$/i,
      }
      const promptLabel = {
        en: /agent setup prompt/i,
        fr: /prompt de configuration pour agent/i,
      }
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const section = page.locator('#faq')
      await section.scrollIntoViewIfNeeded()
      await section.getByRole('button', { name: selfHostQuestion[locale] }).click()
      await section.getByText(promptLabel[locale]).waitFor({ timeout: 15_000 })
      await page.waitForTimeout(800)
      await section.getByRole('button', { name: openWith[locale] }).click()
      await page.getByRole('link', { name: /chatgpt/i }).waitFor({ timeout: 10_000 })
      await page.waitForTimeout(600)
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} landing FAQ self-host`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'landing-pricing-stability': {
      const periods = {
        en: { monthly: /^monthly$/i, yearly: /^yearly$/i, lifetime: /^lifetime$/i },
        fr: { monthly: /^mensuel$/i, yearly: /^annuel$/i, lifetime: /^à vie$/i },
      }
      await recordVideo(browser, batch, locale, file, async (page, markVideoStart, markVideoEnd) => {
        await page.goto(`${siteUrl}/${locale}/pricing`, {
          waitUntil: 'networkidle',
          timeout: 120_000,
        })
        await dismissCookies(page, locale)
        const monthly = page.getByRole('button', { name: periods[locale].monthly }).first()
        const yearly = page.getByRole('button', { name: periods[locale].yearly }).first()
        const lifetime = page.getByRole('button', { name: periods[locale].lifetime }).first()
        await monthly.scrollIntoViewIfNeeded()
        await page.evaluate(() => window.scrollBy(0, -140))
        markVideoStart()
        await page.waitForTimeout(1800)
        await yearly.click()
        await page.waitForTimeout(1800)
        await lifetime.click()
        await page.waitForTimeout(2200)
        markVideoEnd()
        await ensureCookiesDismissed(page, locale)
        await assertNoDevIssues(page, `${locale} landing pricing stability`)
      }, playwrightLocale)
      return
    }

    case 'landing-scroll': {
      await recordVideo(browser, batch, locale, file, async (page) => {
        await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
        await dismissCookies(page, locale)
        await page.waitForTimeout(2000)
        await assertNoDevIssues(page, `${locale} landing video`)
        for (const y of [0, 700, 1400, 2100, 1200, 0]) {
          await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
          await page.waitForTimeout(1800)
        }
      }, playwrightLocale)
      return
    }

    case 'landing-features-transition': {
      await recordVideo(browser, batch, locale, file, async (page, markStart, markEnd) => {
        await blockLandingDataRefresh(page, locale, siteUrl)
        await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
        await dismissCookies(page, locale)
        const trigger = page.locator('a[href="#features"]').first()
        await trigger.waitFor({ timeout: 20_000 })
        markStart()
        await page.waitForTimeout(700)
        await trigger.click()
        await page.waitForFunction(() => {
          const target = document.querySelector('#features')
          return window.location.hash === '#features' && target && Math.abs(target.getBoundingClientRect().top) < 180
        }, undefined, { timeout: 15_000 })
        await page.waitForTimeout(2600)
        markEnd()
        await assertNoDevIssues(page, `${locale} landing features transition`)
      }, playwrightLocale)
      return
    }

    case 'import-mobile': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('mobile'),
      })
      await waitForDashboard(page, locale, siteUrl)
      const importBtn = page.getByRole('button', { name: LABELS[locale].import })
      await importBtn.first().click()
      await page.waitForSelector('[role="dialog"]', { timeout: 15_000 })
      await page.waitForTimeout(1200)
      await assertNoDevIssues(page, `${locale} import dialog`)
      await screenshot(page, batch, locale, file)
      await page.keyboard.press('Escape')
      await page.close()
      return
    }

    case 'support': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}/support`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      await page.waitForTimeout(2500)
      await ensureCookiesDismissed(page, locale)
      await page.getByText(LABELS[locale].supportAssistant).first().waitFor({ timeout: 15_000 })
      await assertNoDevIssues(page, `${locale} support`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'trade-table-mobile': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('mobile'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].tableTab)
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr').length >= 3,
        { timeout: 30_000 },
      )
      await page.waitForTimeout(1200)
      await assertNoDevIssues(page, `${locale} trade table mobile`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'trade-table-desktop': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].tableTab)
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr').length >= 5,
        { timeout: 30_000 },
      )
      const showAll = page.getByRole('button', { name: LABELS[locale].showAll })
      if ((await showAll.count()) > 0) {
        await showAll.first().click({ force: true })
        await page.waitForTimeout(2000)
      }
      await assertNoDevIssues(page, `${locale} trade table desktop`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'trade-table-scroll-video': {
      await recordVideo(browser, batch, locale, file, async (page) => {
        await waitForDashboard(page, locale, siteUrl)
        await clickTab(page, LABELS[locale].tableTab)
        await page.waitForFunction(
          () => document.querySelectorAll('table tbody tr').length >= 5,
          { timeout: 30_000 },
        )
        const showAllBtn = page.getByRole('button', { name: LABELS[locale].showAll })
        if ((await showAllBtn.count()) > 0) {
          await showAllBtn.first().click({ force: true })
          await page.waitForTimeout(1500)
        }
        for (let i = 0; i < 6; i++) {
          await page.evaluate(() => window.scrollBy(0, 500))
          await page.waitForTimeout(900)
        }
        await assertNoDevIssues(page, `${locale} trade table video`)
      }, playwrightLocale)
      return
    }

    case 'calendar-widgets': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      const calendarHeading = page.getByText(LABELS[locale].calendarView).first()
      if ((await calendarHeading.count()) > 0) {
        await calendarHeading.scrollIntoViewIfNeeded()
      } else {
        await page.evaluate(() => window.scrollTo(0, 900))
      }
      await page.waitForTimeout(2000)
      await assertNoDevIssues(page, `${locale} calendar widgets`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'calendar-table': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].tableTab)
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr').length >= 3,
        { timeout: 30_000 },
      )
      await page.waitForTimeout(1200)
      await assertNoDevIssues(page, `${locale} calendar table`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'accounts-mobile': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('mobile'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].accountsTab)
      await page.waitForTimeout(2500)
      await assertNoDevIssues(page, `${locale} accounts mobile`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'accounts-table-desktop': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].accountsTab)
      const accountsTableView = page
        .getByRole('tab', { name: LABELS[locale].accountsTableView })
        .last()
      if ((await accountsTableView.count()) > 0) {
        await accountsTableView.click()
        await page.waitForTimeout(2000)
      }
      await page.waitForFunction(
        () => {
          const text = document.body?.innerText ?? ''
          return (
            text.includes('Prop firm') &&
            document.querySelectorAll('table tbody tr').length >= 1
          )
        },
        { timeout: 30_000 },
      )
      await assertNoDevIssues(page, `${locale} accounts table desktop`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'widgets-mobile': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('mobile'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].widgetsTab)
      await page.waitForTimeout(2500)
      await assertNoDevIssues(page, `${locale} widgets mobile`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'widgets-mobile-minimap': {
      // Mobile Widgets tab: expanded toolbar minimap overlay with miniature widget thumbnails.
      const minimapOpen = {
        en: /open widget minimap/i,
        fr: /ouvrir la mini-carte des widgets/i,
      }
      const minimapDialog = {
        en: /widget minimap/i,
        fr: /mini-carte des widgets/i,
      }
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('mobile'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].widgetsTab)
      await page.waitForTimeout(2500)
      const trigger = page.getByRole('button', { name: minimapOpen[locale] })
      await trigger.waitFor({ timeout: 30_000 })
      await trigger.click()
      await page.getByRole('dialog', { name: minimapDialog[locale] }).waitFor({
        timeout: 15_000,
      })
      await page.waitForTimeout(1200)
      await assertNoDevIssues(page, `${locale} widgets mobile minimap`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'billing-mobile': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('mobile'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await page.goto(`${siteUrl}/${locale}/dashboard/billing`, {
        waitUntil: 'networkidle',
        timeout: 120_000,
      })
      await page.getByText(LABELS[locale].paymentHistory).first().waitFor({ timeout: 30_000 })
      await injectBillingPaymentHistoryMock(page, locale)
      await page.getByText(LABELS[locale].paymentHistory).first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(2000)
      await assertNoDevIssues(page, `${locale} billing mobile`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'connections-hub': {
      // Desktop Connections overview with the provider menu open and seeded
      // standalone account visible below it.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      // Warm the dashboard user/trade stores first so the Connections capture
      // does not contain transient avatar or trade-loading indicators.
      await waitForDashboard(page, locale, siteUrl)
      await page.goto(`${siteUrl}/${locale}/dashboard/connections`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      })
      await dismissCookies(page, locale)
      await page.getByText('LOCAL-SIM-001').waitFor({ timeout: 90_000 })
      const addConnection = page.getByRole('button', {
        name: LABELS[locale].addConnection,
      })
      await addConnection.click()
      await page.getByRole('menu').first().waitFor({ timeout: 15_000 })
      await page.locator('[data-sonner-toast]').first().waitFor({
        state: 'hidden',
        timeout: 15_000,
      }).catch(() => {})
      await page.waitForTimeout(1200)
      await assertNoDevIssues(page, `${locale} connections hub`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'widget-info-popover-mobile': {
      // Touch-sized Widgets view with a real seeded widget explanation open.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('mobile'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].widgetsTab)
      const infoTrigger = page
        .getByRole('button', { name: LABELS[locale].moreInformation })
        .first()
      await infoTrigger.waitFor({ timeout: 30_000 })
      await infoTrigger.click()
      await page.getByRole('note', { name: LABELS[locale].moreInformation }).waitFor({
        timeout: 15_000,
      })
      await page.waitForTimeout(1200)
      await assertNoDevIssues(page, `${locale} widget info popover mobile`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'feedback-popover': {
      // Desktop dashboard navbar with the localized feedback form open. The
      // capture only opens the form and never submits a message.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      const feedbackTrigger = page.getByRole('button', {
        name: LABELS[locale].feedback,
      })
      await feedbackTrigger.waitFor({ timeout: 30_000 })
      await feedbackTrigger.click()
      await page.getByText(LABELS[locale].feedbackHeading).waitFor({
        timeout: 15_000,
      })
      await page.waitForTimeout(1200)
      await assertNoDevIssues(page, `${locale} feedback popover`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'update-og-image': {
      // Resolve localized metadata, then save the exact generated OG response
      // rather than rasterizing it again through a browser viewport.
      if (!route) {
        throw new Error(`Missing update route for ${locale}/${file}`)
      }
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}/updates/${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      })
      await dismissCookies(page, locale)
      await assertNoDevIssues(page, `${locale} update Open Graph page`)

      const imageHref = await page
        .locator('meta[property="og:image"]')
        .getAttribute('content')
      if (!imageHref) {
        throw new Error(`Missing og:image metadata for ${locale} update`)
      }

      const imageUrl = new URL(imageHref, page.url()).toString()
      const response = await page.request.get(imageUrl, { timeout: 120_000 })
      const contentType = response.headers()['content-type'] ?? ''
      if (!response.ok() || !contentType.startsWith('image/png')) {
        throw new Error(
          `Invalid OG response for ${locale}: ${response.status()} ${contentType}`,
        )
      }

      const body = await response.body()
      const width = body.readUInt32BE(16)
      const height = body.readUInt32BE(20)
      if (width !== 1200 || height !== 630) {
        throw new Error(`Unexpected OG dimensions for ${locale}: ${width}x${height}`)
      }

      const out = `${outputDir(batch, locale)}/${file}.png`
      fs.writeFileSync(out, body)
      console.log('Saved', out)
      await page.close()
      return
    }

    case 'connections-import-picker': {
      // Connections page with the file-import platform picker open on its full,
      // unfiltered list so IG is visible among the supported platforms.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await openConnectionsForImport(page, locale, siteUrl)
      await sanitizeConnectionIdentifiers(page)
      const { heading, trigger, picker } = await openImportPicker(page, locale)
      await page.getByRole('option', { name: /^IG$/ }).first().waitFor({ timeout: 15_000 })
      await revealPickerOption(page, 'IG')
      await assertNoDevIssues(page, `${locale} connections import picker`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [heading, trigger, picker], 24),
      })
      await page.close()
      return
    }

    case 'connections-import-picker-search': {
      // Same picker with a query typed, proving the list filters as you type.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await openConnectionsForImport(page, locale, siteUrl)
      const { heading, trigger, picker } = await openImportPicker(page, locale)
      await page.keyboard.type(IMPORT_PICKER_SEARCH_QUERY, { delay: 90 })
      await page.waitForFunction(
        (expected) => {
          const root = document.querySelector('[cmdk-root]')
          if (!root) return false
          const count = root.querySelectorAll('[cmdk-item]').length
          return count > 0 && count < expected
        },
        13,
        { timeout: 15_000 },
      )
      await page.waitForTimeout(800)
      await assertNoDevIssues(page, `${locale} connections import picker search`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [heading, trigger, picker], 24),
      })
      await page.close()
      return
    }

    case 'connections-ig-import-preview': {
      // Final IG import step: parsed Transaction History trades plus the notice
      // that counts the rows the importer refused to guess at. Driven by the
      // capture fixture, and stopped before the trades are saved.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await openConnectionsForImport(page, locale, siteUrl)
      await sanitizeConnectionIdentifiers(page)
      const { picker } = await openImportPicker(page, locale)
      await page.getByRole('option', { name: /^IG$/ }).first().click()
      await picker.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {})
      await page.waitForTimeout(1500)

      await page
        .locator('input[type=file]')
        .first()
        .setInputFiles(IG_CAPTURE_FIXTURE)
      // Accepting the file advances to account selection on its own.
      await page.getByText(CAPTURE_ACCOUNT).first().waitFor({ timeout: 30_000 })
      await page.waitForTimeout(1200)
      await page.getByText(CAPTURE_ACCOUNT).first().click()

      const next = page.getByRole('button', { name: LABELS[locale].next }).first()
      await next.waitFor({ timeout: 15_000 })
      if (!(await next.isEnabled())) {
        throw new Error(`Account selection did not enable Next for ${locale} IG import`)
      }
      await next.click()

      const notice = page.locator('[role="status"]').first()
      await notice.waitFor({ timeout: 30_000 })
      const panel = notice.locator('xpath=..')
      await panel.scrollIntoViewIfNeeded()
      await page.waitForTimeout(1200)
      await waitForNavbarBadgeSettled(page)
      await assertNoDevIssues(page, `${locale} IG import preview`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [panel], 20),
      })
      await page.close()
      return
    }

    case 'rithmic-performance-picker': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await openConnectionsForImport(page, locale, siteUrl)
      await sanitizeConnectionIdentifiers(page)
      const { heading, trigger, picker } = await openImportPicker(page, locale)
      await picker.locator('[cmdk-input]').fill('performance')
      const option = page.getByRole('option', {
        name: /^Rithmic Performance$|^Performance Rithmic$/i,
      }).first()
      await option.waitFor({ state: 'visible', timeout: 15_000 })
      await page.waitForTimeout(700)
      await assertNoDevIssues(page, `${locale} Rithmic Performance picker`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [heading, trigger, picker], 24),
      })
      await page.close()
      return
    }

    case 'rithmic-performance-preview': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
        viewport: { width: 1800, height: 1000 },
      })
      await openConnectionsForImport(page, locale, siteUrl)
      await sanitizeConnectionIdentifiers(page)
      const { picker } = await openImportPicker(page, locale)
      await picker.locator('[cmdk-input]').fill('performance')
      await page.getByRole('option', {
        name: /^Rithmic Performance$|^Performance Rithmic$/i,
      }).first().click()
      await picker.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {})
      await page.locator('input[type=file]').first().setInputFiles(
        RITHMIC_PERFORMANCE_CAPTURE_FIXTURE,
      )

      const previewHeading = page.getByRole('heading', {
        name: /^Processed trades$|^Trades traités$/i,
      }).first()
      await previewHeading.waitFor({ state: 'visible', timeout: 30_000 })
      const preview = previewHeading.locator('xpath=ancestor::div[contains(@class,"space-y-8")][1]')
      const rows = preview.locator('tbody tr')
      await rows.nth(1).waitFor({ state: 'visible', timeout: 30_000 })
      await preview.getByText('MES', { exact: true }).first().waitFor({ timeout: 15_000 })
      await preview.getByText('18550.00', { exact: true }).waitFor({ timeout: 15_000 })
      await preview.getByText('47.50', { exact: true }).waitFor({ timeout: 15_000 })
      await waitForNoVisibleToasts(page)
      await preview.scrollIntoViewIfNeeded()
      await page.waitForTimeout(800)
      await assertNoDevIssues(page, `${locale} Rithmic Performance preview`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [preview], 20),
      })
      await page.close()
      return
    }

    case 'equity-nearest-line': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      // A persisted dashboard filter surface can reopen during hydration and
      // cover the equity legend. Close transient overlays before chart hover.
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
      const globalFilter = page.getByPlaceholder(/Search filters|Rechercher.*filtres/i)
      if ((await globalFilter.count()) > 0 && await globalFilter.first().isVisible()) {
        // This is the dashboard's fixed bottom action toolbar, not part of the
        // equity widget. Hide it for a tightly framed chart evidence capture.
        await globalFilter.first().evaluate((element) => {
          const toolbar = element.closest('.fixed')
          if (toolbar instanceof HTMLElement) toolbar.style.display = 'none'
        })
      }
      const heading = page.getByText(CAPTURE_LABELS[locale].equity).first()
      await heading.scrollIntoViewIfNeeded()
      const card = heading.locator('xpath=ancestor::*[contains(@class,"h-full") and contains(@class,"flex-col")][1]')
      const toggle = card.getByRole('switch').first()
      if (!(await toggle.isChecked())) await toggle.click()
      await card.getByRole('button', { name: /Select Accounts|Sélectionner les Comptes/i }).waitFor({ timeout: 30_000 })
      const chart = card.locator('svg.recharts-surface').first()
      const box = await chart.boundingBox()
      if (!box) throw new Error(`Equity chart was not measurable for ${locale}`)
      await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.46)
      await page.waitForTimeout(1200)
      await assertNoDevIssues(page, `${locale} nearest equity line`)
      await screenshot(page, batch, locale, file, { clip: await clipAround(page, [card], 16) })
      await page.close()
      return
    }

    case 'equity-account-selector': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      const heading = page.getByText(CAPTURE_LABELS[locale].equity).first()
      await heading.scrollIntoViewIfNeeded()
      const card = heading.locator('xpath=ancestor::*[contains(@class,"h-full") and contains(@class,"flex-col")][1]')
      const toggle = card.getByRole('switch').first()
      if (!(await toggle.isChecked())) await toggle.click()
      const trigger = card.getByRole('button', { name: /Select Accounts|Sélectionner les Comptes/i })
      await trigger.click()
      const picker = page.locator('[cmdk-root]').last()
      await picker.waitFor({ timeout: 15_000 })
      await picker.locator('[cmdk-input]').fill('DEMO-09')
      await page.waitForTimeout(900)
      await assertNoDevIssues(page, `${locale} equity account selector`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [heading, trigger, picker], 24),
      })
      await page.close()
      return
    }

    case 'dxfeed-firm-search': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      const dialog = await openConnectionService(
        page,
        locale,
        siteUrl,
        CAPTURE_LABELS[locale].dxfeed,
        '#dxfeed-prop-firm',
      )
      const pickerTrigger = dialog.locator('#dxfeed-prop-firm')
      await pickerTrigger.click()
      const picker = page.locator('[cmdk-root]').last()
      await picker.locator('[cmdk-input]').fill('My Funded')
      await page.getByRole('option', { name: /My Funded Futures/i }).waitFor({ timeout: 15_000 })
      await page.waitForTimeout(800)
      const form = dialog.locator('form').first()
      const heading = dialog.getByRole('heading').first()
      const description = form.locator(':scope > p').first()
      const firmField = dialog.locator('#dxfeed-prop-firm').locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]')
      await waitForNoVisibleToasts(page)
      await assertNoDevIssues(page, `${locale} DxFeed firm search`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [heading, description, firmField, picker], 20),
      })
      await page.close()
      return
    }

    case 'dxfeed-credentials-step': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      const dialog = await openConnectionService(
        page,
        locale,
        siteUrl,
        CAPTURE_LABELS[locale].dxfeed,
        '#dxfeed-prop-firm',
      )
      await dialog.locator('#dxfeed-prop-firm').click()
      const picker = page.locator('[cmdk-root]').last()
      await picker.locator('[cmdk-input]').fill('My Funded')
      await page.getByRole('option', { name: /My Funded Futures/i }).click()
      await dialog.locator('#dxfeed-email').scrollIntoViewIfNeeded()
      await page.waitForTimeout(700)
      const heading = dialog.getByRole('heading').first()
      const form = dialog.locator('form').first()
      const description = form.locator(':scope > p').first()
      const firmField = dialog.locator('#dxfeed-prop-firm').locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]')
      const emailField = dialog.locator('#dxfeed-email').locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]')
      const passwordField = dialog.locator('#dxfeed-password').locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]')
      const connect = form.locator('button[type="submit"]')
      await waitForNoVisibleToasts(page)
      await assertNoDevIssues(page, `${locale} DxFeed credential step`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(
          page,
          [heading, description, firmField, emailField, passwordField, connect],
          20,
        ),
      })
      await page.close()
      return
    }

    case 'ibkr-read-only-guide': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      const dialog = await openConnectionService(
        page,
        locale,
        siteUrl,
        CAPTURE_LABELS[locale].ibkr,
        '#ibkr-credentials',
      )
      const note = dialog.getByRole('note')
      await note.scrollIntoViewIfNeeded()
      await page.waitForTimeout(700)
      const guide = dialog.locator('ol').first().locator('xpath=..')
      await waitForNoVisibleToasts(page)
      await assertNoDevIssues(page, `${locale} IBKR setup guide`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [guide, note], 20),
      })
      await page.close()
      return
    }

    case 'ibkr-token-query-form': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      const dialog = await openConnectionService(
        page,
        locale,
        siteUrl,
        CAPTURE_LABELS[locale].ibkr,
        '#ibkr-credentials',
      )
      const field = dialog.locator('#ibkr-credentials')
      await field.fill('Token: 11112222333344445555666677778888\nQuery ID: 5556667')
      await field.scrollIntoViewIfNeeded()
      await page.waitForTimeout(800)
      const form = field.locator('xpath=ancestor::form[1]')
      const verify = form.getByRole('button', { name: /Verify and connect|Vérifier et connecter/i })
      await waitForNoVisibleToasts(page)
      await assertNoDevIssues(page, `${locale} IBKR token query form`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [field.locator('xpath=..'), verify], 24),
      })
      await page.close()
      return
    }

    case 'mobile-form-focus-stability': {
      await recordVideo(browser, batch, locale, file, async (page, markStart, markEnd) => {
        const dialog = await openConnectionService(
          page,
          locale,
          siteUrl,
          CAPTURE_LABELS[locale].dxfeed,
          '#dxfeed-prop-firm',
        )
        const email = dialog.locator('#dxfeed-email')
        await email.scrollIntoViewIfNeeded()
        await waitForNoVisibleToasts(page)
        markStart()
        await page.waitForTimeout(700)
        await email.focus()
        await page.keyboard.type(locale === 'en' ? 'capture@example.test' : 'capture@exemple.test', { delay: 65 })
        await page.waitForTimeout(1200)
        await page.keyboard.press('Tab')
        await page.waitForTimeout(1000)
        markEnd()
        await assertNoDevIssues(page, `${locale} mobile form focus stability`)
      }, playwrightLocale, 'mobile')
      return
    }

    case 'authentication-desktop':
    case 'authentication-email-code':
    case 'authentication-mobile': {
      const preset = scene === 'authentication-mobile' ? 'mobile' : 'desktop'
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport(preset),
      })
      await page.goto(`${siteUrl}/${locale}/authentication`, {
        waitUntil: 'networkidle',
        timeout: 120_000,
      })
      await dismissCookies(page, locale)
      if (!/\/authentication(?:\?|$)/.test(page.url())) {
        throw new Error(`Authentication capture requires bypass disabled; redirected to ${page.url()}`)
      }
      await page.locator('#email').waitFor({ timeout: 30_000 })
      if (scene === 'authentication-email-code') {
        await injectAuthenticationEmailFixture(page, locale)
      }
      await page.waitForTimeout(1500)
      await assertNoDevIssues(page, `${locale} ${scene}`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'support-source-investigation':
    case 'support-question-edit': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}/support`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      await page.getByText(LABELS[locale].supportAssistant).first().waitFor({ timeout: 20_000 })
      await injectSupportConversationFixture(
        page,
        locale,
        scene === 'support-question-edit' ? 'edit' : 'investigation',
      )
      const fixture = page.locator('[data-changelog-support-fixture]')
      await fixture.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await assertNoDevIssues(page, `${locale} ${scene}`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [fixture], 24),
      })
      await page.close()
      return
    }

    case 'support-contact-form': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}/support`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const headerAction = page.getByRole('button', { name: CAPTURE_LABELS[locale].supportRequest })
      await headerAction.click()
      const dialog = page.getByRole('dialog').last()
      await dialog.waitFor({ timeout: 15_000 })
      const email = dialog.locator('input[type=email]')
      if ((await email.count()) > 0) await email.fill(locale === 'en' ? 'capture@example.test' : 'capture@exemple.test')
      const textarea = dialog.locator('textarea')
      await textarea.fill(locale === 'en'
        ? 'Synthetic capture request — this form will not be submitted.'
        : 'Demande de capture synthétique — ce formulaire ne sera pas envoyé.')
      await page.waitForTimeout(500)
      await assertNoDevIssues(page, `${locale} support contact form`)
      await screenshot(page, batch, locale, file, { clip: await clipAround(page, [dialog], 20) })
      await page.close()
      return
    }

    case 'connection-sync-intervals':
    case 'connection-sync-daily': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await openConnections(page, locale, siteUrl)
      await waitForNavbarBadgeSettled(page)
      await sanitizeConnectionIdentifiers(page)
      const trigger = page.locator('button').filter({ hasText: CAPTURE_LABELS[locale].schedule }).first()
      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()
      const menu = page.getByRole('menu').last()
      await menu.waitFor({ timeout: 15_000 })
      const targets = [trigger, menu]
      if (scene === 'connection-sync-daily') {
        const daily = menu.getByRole('menuitem').filter({ hasText: CAPTURE_LABELS[locale].daily }).first()
        await daily.hover()
        const menus = page.getByRole('menu')
        await page.waitForFunction(
          () => document.querySelectorAll('[role="menu"]').length >= 2,
          undefined,
          { timeout: 10_000 },
        )
        targets.push(menus.last())
      }
      await page.waitForTimeout(700)
      await assertNoDevIssues(page, `${locale} ${scene}`)
      await screenshot(page, batch, locale, file, { clip: await clipAround(page, targets, 24) })
      await page.close()
      return
    }

    case 'connection-sync-mobile': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('mobile'),
      })
      await openConnections(page, locale, siteUrl)
      await sanitizeConnectionIdentifiers(page)
      const trigger = page.locator('button').filter({ hasText: CAPTURE_LABELS[locale].schedule }).first()
      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()
      const dialog = page.getByRole('dialog').last()
      await dialog.waitFor({ timeout: 15_000 })
      const daily = dialog.getByRole('button', { name: CAPTURE_LABELS[locale].daily }).first()
      await daily.waitFor({ state: 'visible', timeout: 15_000 })
      if ((await daily.getAttribute('aria-expanded')) !== 'true') await daily.click()
      await dialog.locator('input[type=time]').waitFor({ state: 'visible', timeout: 15_000 })
      await waitForNoVisibleToasts(page)
      await page.evaluate(() => {
        for (const element of document.querySelectorAll('*')) {
          if (
            element.children.length === 0 &&
            /^(loading|chargement)(?:\.{3}|…)?$/i.test((element.textContent ?? '').trim())
          ) {
            const badge = element.closest('[data-slot="badge"]') ?? element.parentElement
            if (badge instanceof HTMLElement) badge.style.visibility = 'hidden'
          }
        }
      })
      await page.waitForTimeout(600)
      await assertNoDevIssues(page, `${locale} connection sync mobile`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'rithmic-system-search': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      const dialog = await openConnectionService(
        page,
        locale,
        siteUrl,
        CAPTURE_LABELS[locale].rithmicProtocol,
        '#rithmic-protocol-system',
      )
      const trigger = dialog.locator('#rithmic-protocol-system')
      await trigger.waitFor({ state: 'visible', timeout: 30_000 })
      await page.waitForFunction(() => {
        const element = document.querySelector('#rithmic-protocol-system')
        return element && !element.hasAttribute('disabled')
      }, undefined, { timeout: 90_000 })
      await trigger.click()
      const picker = page.locator('[cmdk-root]').last()
      await picker.locator('[cmdk-input]').fill('Paper')
      await page.getByRole('option', { name: /Rithmic Paper Trading/i }).waitFor({ timeout: 15_000 })
      await page.waitForTimeout(600)
      await waitForNoVisibleToasts(page)
      await assertNoDevIssues(page, `${locale} Rithmic system search`)
      const heading = dialog.getByText(/Add Rithmic Protocol connection|Ajouter une connexion Rithmic Protocol/i).first()
      const connectPoint = dialog.locator('#rithmic-protocol-connect-point')
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [heading, connectPoint, picker], 24),
      })
      await page.close()
      return
    }

    case 'rithmic-credentials-step': {
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      const dialog = await openConnectionService(
        page,
        locale,
        siteUrl,
        CAPTURE_LABELS[locale].rithmicProtocol,
        '#rithmic-protocol-system',
      )
      const trigger = dialog.locator('#rithmic-protocol-system')
      await page.waitForFunction(() => {
        const element = document.querySelector('#rithmic-protocol-system')
        return element && !element.hasAttribute('disabled')
      }, undefined, { timeout: 90_000 })
      await trigger.click()
      await page.getByRole('option', { name: /Rithmic Paper Trading/i }).click()
      await dialog.locator('#rithmic-protocol-username').fill('capture-demo-user')
      await dialog.locator('#rithmic-protocol-password').fill('synthetic-password')
      await dialog.locator('#rithmic-protocol-history-start').fill('2026-07-01')
      const start = dialog.locator('#rithmic-protocol-history-start')
      await start.blur()
      await start.scrollIntoViewIfNeeded()
      await page.waitForTimeout(600)
      const form = start.locator('xpath=ancestor::form[1]')
      await waitForNoVisibleToasts(page)
      await assertNoDevIssues(page, `${locale} Rithmic credential step`)
      const heading = dialog.getByText(/Add Rithmic Protocol connection|Ajouter une connexion Rithmic Protocol/i).first()
      const connect = form.getByRole('button', { name: /^Connect$|^Connecter$/i })
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [heading, start, connect], 16),
      })
      await page.close()
      return
    }

    case 'dashboard-shell-home': {
      // pr-475: v5 dashboard shell in one frame — logo + compact view menu +
      // This week / + Filter in the h-14 navbar, the Connections strip below
      // it, and the floating Edit | Add toolbar pill at the bottom. Viewport
      // 1440x900 desktop; no clip, the whole chrome together is the story.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await page
        .getByRole('navigation', { name: CAPTURE_LABELS[locale].connectionsStrip })
        .waitFor({ timeout: 30_000 })
      await waitForNoVisibleToasts(page)
      await page.waitForTimeout(1200)
      await assertNoDevIssues(page, `${locale} dashboard shell home`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'dashboard-shell-filters': {
      // pr-475: desktop filters sheet opened from the top bar's + Filter
      // control. Expands the Accounts fold section (one section open at a
      // time, same pattern as the account drawer) and selects every seeded
      // account so the pinned active-filter chip + Clear all action render
      // above the collapsed sections.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      const addFilter = page
        .getByRole('button', { name: CAPTURE_LABELS[locale].filtersAria })
        .first()
      await addFilter.waitFor({ timeout: 15_000 })
      await addFilter.click()
      const sheet = page.getByRole('dialog').last()
      await sheet.waitFor({ timeout: 15_000 })
      const accountsToggle = sheet.getByRole('button', {
        name: CAPTURE_LABELS[locale].accountsSection,
        exact: true,
      })
      await accountsToggle.click()
      const selectAll = sheet.getByText(CAPTURE_LABELS[locale].selectAllAccounts, {
        exact: true,
      })
      await selectAll.waitFor({ timeout: 15_000 })
      await selectAll.click()
      await sheet
        .getByRole('button', { name: CAPTURE_LABELS[locale].clearAll })
        .waitFor({ timeout: 15_000 })
      await page.waitForTimeout(700)
      await assertNoDevIssues(page, `${locale} dashboard shell filters`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [sheet], 12),
      })
      await page.close()
      return
    }

    case 'settings-account-list': {
      // pr-475: Settings v2 stacked list — Account, Linked accounts, Weekly
      // recap (switch on), Team, Sign out, Delete account — reached through
      // the hydrated dashboard so the subpage header and card borders render
      // cleanly (same reasoning as openConnectionsForImport).
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await page.goto(`${siteUrl}/${locale}/dashboard/settings`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      })
      await dismissCookies(page, locale)
      const weeklyRecapSwitch = page.getByRole('switch', {
        name: CAPTURE_LABELS[locale].weeklyRecap,
      })
      await weeklyRecapSwitch.waitFor({ timeout: 30_000 })
      await page
        .waitForFunction(
          () => {
            const el = document.querySelector('button[role="switch"]')
            return Boolean(el) && el.getAttribute('disabled') === null
          },
          undefined,
          { timeout: 30_000 },
        )
        .catch(() => {})
      if (!(await weeklyRecapSwitch.isChecked())) {
        await weeklyRecapSwitch.click()
        await page.waitForTimeout(600)
      }
      await page
        .getByRole('button', { name: CAPTURE_LABELS[locale].deleteAccount })
        .first()
        .waitFor({ timeout: 15_000 })
      await waitForNoVisibleToasts(page)
      await page.waitForTimeout(500)
      await assertNoDevIssues(page, `${locale} settings account list`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'dxfeed-single-step-form': {
      // pr-475: current single-step DxFeed connect sheet — Username +
      // Password only, no firm picker. Opened from the dashboard connections
      // strip + chip (v5 chrome); the old Connections-page #import-data
      // nav link is gone. IDs verified in dxfeed-connect-form.tsx
      // (#dxfeed-username / #dxfeed-password). Empty fields only.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      const strip = page.getByRole('navigation', {
        name: CAPTURE_LABELS[locale].connectionsStrip,
      })
      await strip.waitFor({ timeout: 30_000 })
      await strip.getByRole('button', { name: CAPTURE_LABELS[locale].addChip }).click()
      const menu = page.getByRole('menu').last()
      await menu.waitFor({ timeout: 15_000 })
      await menu.getByRole('menuitem').filter({ hasText: CAPTURE_LABELS[locale].dxfeed }).click()
      const dialog = page.getByRole('dialog').last()
      await dialog.waitFor({ timeout: 20_000 })
      await dialog.locator('#dxfeed-username').waitFor({ timeout: 20_000 })
      const heading = dialog.getByRole('heading').first()
      const form = dialog.locator('form').first()
      const description = form.locator(':scope > p').first()
      const usernameField = dialog
        .locator('#dxfeed-username')
        .locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]')
      const passwordField = dialog
        .locator('#dxfeed-password')
        .locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]')
      const connect = form.locator('button[type="submit"]')
      await passwordField.scrollIntoViewIfNeeded()
      await page.waitForTimeout(700)
      await waitForNoVisibleToasts(page)
      await assertNoDevIssues(page, `${locale} DxFeed single-step form`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(
          page,
          [heading, description, usernameField, passwordField, connect],
          20,
        ),
      })
      await page.close()
      return
    }

    case 'compare-hub-journals-table': {
      // Desktop public hub /{locale}/trading-journal/futures.
      // Viewport 1440x900. Interaction: dismiss cookies, scroll to the
      // journals section (the hero H1 is the already-published journal line).
      // Locator: h2 Journals comparison / Comparaison des journaux, then the
      // wrapping <section>. Expected: Deltalytix Us/Nous + You're here /
      // Vous êtes ici, three View more → / Voir plus → rows, no Soon/Later.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}/trading-journal/futures`, {
        waitUntil: 'networkidle',
        timeout: 120_000,
      })
      await dismissCookies(page, locale)
      const heading = page.getByRole('heading', {
        level: 2,
        name: CAPTURE_LABELS[locale].compareJournalsHeading,
      })
      await heading.waitFor({ timeout: 30_000 })
      const journals = heading.locator('xpath=ancestor::section[1]')
      await journals.scrollIntoViewIfNeeded()
      await journals.getByText(CAPTURE_LABELS[locale].youAreHere).first().waitFor({
        timeout: 15_000,
      })
      const viewMore = journals.getByText(CAPTURE_LABELS[locale].viewMore)
      await viewMore.first().waitFor({ timeout: 15_000 })
      if ((await viewMore.count()) < 3) {
        throw new Error(`Hub table is missing competitor View more rows for ${locale}`)
      }
      const leftover = await journals.getByText(/Soon|Later|Bientôt/i).count()
      if (leftover > 0) {
        throw new Error(`Hub table still shows Soon/Later chips for ${locale}`)
      }
      await page.waitForTimeout(800)
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} compare hub journals table`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [journals], 24),
      })
      await page.close()
      return
    }

    case 'compare-tradezella-what-you-get': {
      // Desktop 1:1 /{locale}/trading-journal/futures/tradezella.
      // Viewport 1440x1400 so the large H1 and first Us vs Them section share
      // a frame. Locator: breadcrumb nav, h1 Deltalytix vs TradeZella.,
      // heading 01 WHAT YOU GET / 01 Ce que vous avez. Expected: Deltalytix
      // and TradeZella columns under that section. No interaction beyond load.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
        viewport: { width: 1440, height: 1400 },
      })
      await page.goto(
        `${siteUrl}/${locale}/trading-journal/futures/tradezella`,
        { waitUntil: 'networkidle', timeout: 120_000 },
      )
      await dismissCookies(page, locale)
      const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
      const title = page.getByRole('heading', {
        level: 1,
        name: /Deltalytix vs TradeZella/i,
      })
      await title.waitFor({ timeout: 30_000 })
      const whatYouGet = page.getByRole('heading', {
        name: CAPTURE_LABELS[locale].compareWhatYouGet,
      })
      await whatYouGet.waitFor({ timeout: 15_000 })
      const section = whatYouGet.locator('xpath=ancestor::section[1]')
      await title.scrollIntoViewIfNeeded()
      await page.waitForTimeout(600)
      await ensureCookiesDismissed(page, locale)
      await assertNoDevIssues(page, `${locale} compare TradeZella 1:1`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [breadcrumb, title, section], 24),
      })
      await page.close()
      return
    }

    case 'connections-import-picker-deepcharts': {
      // Desktop Connections, file-import picker filtered to DeepCharts.
      // Viewport 1440x900. Route: /{locale}/dashboard then navbar to
      // /dashboard/connections (openConnectionsForImport). Interaction: open
      // Upload a file / Ajouter avec un fichier, type "deepcharts".
      // Locator: [cmdk-root] option DeepCharts under Platform CSV Import /
      // Import CSV Plateforme. Expected: monochrome mark + DeepCharts Trade
      // List CSV / CSV Trade List DeepCharts. Does not select CSV with AI.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await openConnectionsForImport(page, locale, siteUrl)
      await sanitizeConnectionIdentifiers(page)
      const { heading, trigger, picker } = await openImportPicker(page, locale)
      await picker.locator('[cmdk-input]').fill('deepcharts')
      const option = page.getByRole('option', {
        name: CAPTURE_LABELS[locale].deepcharts,
      }).first()
      await option.waitFor({ state: 'visible', timeout: 15_000 })
      await option.scrollIntoViewIfNeeded()
      await page.waitForTimeout(700)
      await assertNoDevIssues(page, `${locale} DeepCharts import picker`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [heading, trigger, picker], 24),
      })
      await page.close()
      return
    }

    case 'dashboard-strip-standalone-actions': {
      // Desktop dashboard connections strip — not the Connections page.
      // Viewport 1440x900. Route: /{locale}/dashboard. Interaction: click the
      // Standalone / Autonome chip. Locator: strip nav + chip + [cmdk-root]
      // popover. Expected: LOCAL-SIM-001 with name-above-number, Mask/Masquer
      // eye, rename pencil, and Delete trash. Do not click mask (persists
      // Hidden Accounts) and do not click trash in this scene.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      const { chip, picker } = await openStandaloneStripPicker(
        page,
        locale,
        siteUrl,
      )
      await waitForNoVisibleToasts(page)
      await assertNoDevIssues(page, `${locale} strip standalone actions`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [chip, picker], 24),
      })
      await page.close()
      return
    }

    case 'dashboard-strip-standalone-delete-confirm': {
      // Same dashboard strip path. After the picker is open, click trash on
      // LOCAL-SIM-001 only. The confirm dialog lives on the strip (picker
      // closes). Expected: Delete this account? / Supprimer ce compte ? with
      // Cancel / Annuler and Delete account / Supprimer le compte.
      // MUST click Cancel only — never the destructive action.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await openStandaloneStripPicker(page, locale, siteUrl)
      await page
        .getByRole('button', { name: CAPTURE_LABELS[locale].deleteStandalone })
        .click()
      const dialog = page
        .getByRole('alertdialog')
        .or(page.getByRole('dialog'))
        .last()
      await dialog.waitFor({ timeout: 15_000 })
      await dialog
        .getByRole('heading', { name: CAPTURE_LABELS[locale].deleteConfirmTitle })
        .waitFor({ timeout: 10_000 })
      await dialog.getByText(CAPTURE_ACCOUNT).first().waitFor({ timeout: 10_000 })
      const cancel = dialog.getByRole('button', {
        name: CAPTURE_LABELS[locale].cancel,
      })
      await cancel.waitFor({ timeout: 10_000 })
      await page.waitForTimeout(500)
      await waitForNoVisibleToasts(page)
      await assertNoDevIssues(page, `${locale} strip standalone delete confirm`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [dialog], 20),
      })
      await cancel.click()
      await dialog.waitFor({ state: 'hidden', timeout: 10_000 })
      await page.close()
      return
    }

    case 'calendar-header-month-year-news': {
      // Desktop Widgets view, daily calendar header only — not the day grid.
      // Viewport 1440x900. Route: /{locale}/dashboard.
      // Interaction: wait for dashboard, ensure Widgets, scroll the picker
      // into view. Does not open Month, Year, or News (closed chips are the
      // claim; native <select> lists are OS chrome).
      // Locator: [data-slot="calendar-month-year-picker"] with month + year
      // selects visible, plus [data-slot="calendar-news-filter"], clipped
      // via the wrapping [data-slot="card-header"].
      // Expected: prev / month chip / next / year chip / monthly total /
      // News (newspaper icon + News label). EN month name + News; FR month
      // name + News.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].widgetsTab)
      const picker = page.locator('[data-slot="calendar-month-year-picker"]')
      await picker.waitFor({ timeout: 30_000 })
      await page.locator('[data-slot="calendar-month-select"]').waitFor({
        timeout: 15_000,
      })
      await page.locator('[data-slot="calendar-year-select"]').waitFor({
        timeout: 15_000,
      })
      const news = page.locator('[data-slot="calendar-news-filter"]')
      await news.waitFor({ timeout: 15_000 })
      const header = picker.locator(
        'xpath=ancestor::*[@data-slot="card-header"][1]',
      )
      await header.scrollIntoViewIfNeeded()
      await waitForNoVisibleToasts(page)
      await page.waitForTimeout(600)
      await assertNoDevIssues(page, `${locale} calendar header month year news`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [header], 8),
      })
      await page.close()
      return
    }

    case 'dashboard-centered-view-tabs': {
      // Desktop home navbar at 1440 so md tabs paint (hidden below md).
      // Viewport 1440x900. Route: /{locale}/dashboard (home chrome only).
      // Interaction: wait for dashboard, confirm Widgets selected, settle
      // the navbar subscription badge. Does not open the phone dropdown.
      // Locator: sticky <nav> (h-14). Expected: logo + filters on the left,
      // centered tablist Widgets | Table | Accounts (FR: Widgets | Tableau |
      // Comptes) with Widgets as the raised white pill, share + account on
      // the right.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await waitForDashboard(page, locale, siteUrl)
      const tablist = page.getByRole('tablist').first()
      await tablist.waitFor({ timeout: 15_000 })
      const widgets = tablist.getByRole('tab', {
        name: LABELS[locale].widgetsTab,
      })
      await widgets.waitFor({ timeout: 10_000 })
      if ((await widgets.getAttribute('aria-selected')) !== 'true') {
        await widgets.click()
        await page.waitForTimeout(400)
      }
      await tablist
        .getByRole('tab', { name: LABELS[locale].tableTab })
        .waitFor({ timeout: 10_000 })
      await tablist
        .getByRole('tab', { name: LABELS[locale].accountsTab })
        .waitFor({ timeout: 10_000 })
      await waitForNavbarBadgeSettled(page)
      await waitForNoVisibleToasts(page)
      const nav = page.locator('nav').first()
      await page.waitForTimeout(400)
      await assertNoDevIssues(page, `${locale} dashboard centered view tabs`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [nav], 12),
      })
      await page.close()
      return
    }

    case 'dashboard-home-email': {
      // Email still (16:9): current beta dashboard HOME from the top of the
      // window through the first widget row. Not a changelog card crop and
      // not the landing Import Trades shot. Viewport 1440×900 desktop so md
      // tabs paint; clip is 1440×810 (16:9) from y=0. Light theme. Widgets
      // selected. Centered tablist in the top bar (not the phone dropdown).
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        colorScheme: 'light',
        ...viewport('desktop'),
      })
      await page.addInitScript(() => {
        window.localStorage.setItem('theme', 'light')
      })
      await waitForDashboard(page, locale, siteUrl)
      const tablist = page.getByRole('tablist').first()
      await tablist.waitFor({ timeout: 15_000 })
      const widgets = tablist.getByRole('tab', {
        name: LABELS[locale].widgetsTab,
      })
      await widgets.waitFor({ timeout: 10_000 })
      if ((await widgets.getAttribute('aria-selected')) !== 'true') {
        await widgets.click()
        await page.waitForTimeout(400)
      }
      await tablist
        .getByRole('tab', { name: LABELS[locale].tableTab })
        .waitFor({ timeout: 10_000 })
      await tablist
        .getByRole('tab', { name: LABELS[locale].accountsTab })
        .waitFor({ timeout: 10_000 })
      await page
        .getByRole('navigation', { name: CAPTURE_LABELS[locale].connectionsStrip })
        .waitFor({ timeout: 30_000 })
      await page.locator('.react-grid-item').first().waitFor({ timeout: 30_000 })
      await waitForNavbarBadgeSettled(page)
      await waitForNoVisibleToasts(page)
      const size = page.viewportSize()
      const clipWidth = size?.width ?? 1440
      const clipHeight = Math.round((clipWidth * 9) / 16)
      await page.waitForTimeout(600)
      await assertNoDevIssues(page, `${locale} dashboard home email`)
      await screenshot(page, batch, locale, file, {
        clip: { x: 0, y: 0, width: clipWidth, height: clipHeight },
      })
      await page.close()
      return
    }

    case 'renewal-notice-email': {
      // Inbox letter, not an in-app route. Renders RenewalNoticeEmail with
      // the locked Paper sample (Hugo / Apex / LOCAL-SIM-001 / 5→12 Sep).
      // Viewport 720×1600 so the fluid 100% table stays letter-width.
      // Expected EN: Account payment, Hi Hugo,, Apex payment in 7 days.,
      // September, Change reminder. FR: Paiement du compte, Bonjour Hugo,,
      // Paiement Apex dans 7 jours., Septembre, Modifier le rappel.
      const html = execFileSync(
        'bun',
        [path.join(process.cwd(), 'scripts/changelog-media/render-renewal-notice.mjs'), locale],
        { encoding: 'utf8', cwd: process.cwd() },
      )
      const expected = locale === 'fr'
        ? ['Paiement du compte', 'Bonjour Hugo,', 'Paiement Apex dans 7 jours.', 'Septembre', 'Modifier le rappel']
        : ['Account payment', 'Hi Hugo,', 'Apex payment in 7 days.', 'September', 'Change reminder']
      for (const needle of expected) {
        if (!html.includes(needle)) {
          throw new Error(`renewal-notice-email ${locale} HTML missing “${needle}”`)
        }
      }
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        colorScheme: 'light',
        viewport: { width: 720, height: 1600 },
        deviceScaleFactor: resolveDeviceScaleFactor(),
      })
      await page.setContent(html, { waitUntil: 'networkidle' })
      await page.locator('img.brand-mark-light').first().waitFor({ state: 'visible', timeout: 15_000 })
      await page.getByText(expected[2], { exact: true }).waitFor({ timeout: 10_000 })
      const body = page.locator('body')
      const box = await body.boundingBox()
      if (!box || box.height < 400) {
        throw new Error(`renewal-notice-email ${locale} body is too short to be the letter`)
      }
      await page.waitForTimeout(400)
      await screenshot(page, batch, locale, file, {
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.min(720, box.width),
          height: Math.min(1600, box.height),
        },
      })
      await page.close()
      return
    }

    case 'public-404-agent-resources': {
      // Desktop public unmatched URL /{locale}/this-page-does-not-exist.
      // Must hit app/global-not-found.tsx (agent block), not in-route
      // app/not-found.tsx. Viewport 1440x900. Locator: section labelled
      // "For AI agents and crawlers" (hardcoded English in both locales).
      // Interaction: wait, scroll into view. Expected: sitemap /llms.txt /
      // API pointers and collapsed Markdown version. Does not expand details
      // and does not include the unchanged 404 illustration.
      const page = await newCapturePage(browser, {
        locale: playwrightLocale,
        ...viewport('desktop'),
      })
      await page.goto(`${siteUrl}/${locale}/this-page-does-not-exist`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      })
      const heading = page.getByRole('heading', {
        name: CAPTURE_LABELS[locale].agentResources,
      })
      await heading.waitFor({ timeout: 30_000 })
      const section = page.locator(
        'section[aria-labelledby="agent-resources-heading"]',
      )
      await section.scrollIntoViewIfNeeded()
      await section.getByText('llms.txt').first().waitFor({ timeout: 10_000 })
      await section.getByText('Markdown version').waitFor({ timeout: 10_000 })
      await page.waitForTimeout(600)
      await assertNoDevIssues(page, `${locale} public 404 agent resources`)
      await screenshot(page, batch, locale, file, {
        clip: await clipAround(page, [section], 20),
      })
      await page.close()
      return
    }

    default:
      throw new Error(`Unknown changelog scene: ${scene}`)
  }
}
