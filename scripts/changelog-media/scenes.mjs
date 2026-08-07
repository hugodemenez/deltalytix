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
import { LABELS, viewport } from './constants.mjs'

/** Seeded standalone account the IG import capture targets. */
const CAPTURE_ACCOUNT = 'LOCAL-SIM-001'

/** Multi-trade IG export with one cash row and one fractional row, for capture only. */
const IG_CAPTURE_FIXTURE = path.join(
  process.cwd(),
  'scripts/changelog-media/fixtures/ig-transaction-history-capture.csv',
)

/**
 * Query typed into the import picker search field. Narrows the list sharply
 * while still leaving more than one result, so the filtering is unmistakable.
 */
const IMPORT_PICKER_SEARCH_QUERY = 'rithmic'

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
  await page.locator('#import-data').first().click()
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

/** @typedef {'landing-hero' | 'landing-scroll' | 'landing-contribution-graph' | 'landing-contribution-graph-hover' | 'landing-ai-journaling-demo' | 'landing-features-carousel' | 'landing-navbar-updates' | 'landing-faq-expanded' | 'landing-faq-self-host' | 'landing-pricing-stability' | 'import-mobile' | 'support' | 'trade-table-mobile' | 'trade-table-desktop' | 'trade-table-scroll-video' | 'calendar-widgets' | 'calendar-table' | 'accounts-mobile' | 'accounts-table-desktop' | 'widgets-mobile' | 'widgets-mobile-minimap' | 'billing-mobile' | 'connections-hub' | 'connections-import-picker' | 'connections-import-picker-search' | 'connections-ig-import-preview' | 'widget-info-popover-mobile' | 'feedback-popover' | 'update-og-image'} ChangelogScene */

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
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const section = page.locator('#ai-journaling')
      await section.scrollIntoViewIfNeeded()
      await page.waitForSelector('.coach-insight', { timeout: 20_000 })
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

    default:
      throw new Error(`Unknown changelog scene: ${scene}`)
  }
}
