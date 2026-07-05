import {
  assertNoDevIssues,
  clickTab,
  dismissCookies,
  recordVideo,
  screenshot,
  waitForDashboard,
} from './helpers.mjs'
import { LABELS } from './constants.mjs'

/** @typedef {'landing-hero' | 'landing-scroll' | 'landing-contribution-graph' | 'import-mobile' | 'support' | 'trade-table-mobile' | 'trade-table-desktop' | 'trade-table-scroll-video' | 'calendar-widgets' | 'calendar-table' | 'accounts-mobile' | 'accounts-table-desktop' | 'widgets-mobile'} ChangelogScene */

/**
 * @param {import('playwright-core').Browser} browser
 * @param {{ batch: string, locale: string, file: string, scene: ChangelogScene, siteUrl: string, playwrightLocale: string }} options
 */
export async function captureScene(browser, options) {
  const { batch, locale, file, scene, siteUrl, playwrightLocale } = options

  switch (scene) {
    case 'landing-hero': {
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 1440, height: 900 },
      })
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      await page.waitForTimeout(3000)
      await assertNoDevIssues(page, `${locale} landing`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'landing-contribution-graph': {
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 1440, height: 900 },
      })
      await page.goto(`${siteUrl}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      const section = page.locator('#open-source')
      await section.scrollIntoViewIfNeeded()
      await page.waitForTimeout(3000)
      await assertNoDevIssues(page, `${locale} contribution graph`)
      await screenshot(page, batch, locale, file)
      await page.close()
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
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
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
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 1280, height: 900 },
      })
      await page.goto(`${siteUrl}/${locale}/support`, { waitUntil: 'networkidle', timeout: 120_000 })
      await dismissCookies(page, locale)
      await page.waitForTimeout(2500)
      await page.getByText(LABELS[locale].supportAssistant).first().waitFor({ timeout: 15_000 })
      await assertNoDevIssues(page, `${locale} support`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'trade-table-mobile': {
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
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
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 1440, height: 900 },
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
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 1440, height: 900 },
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
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 1440, height: 900 },
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
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
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
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 1440, height: 900 },
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].accountsTab)
      const tableView = page.getByRole('tab', { name: LABELS[locale].tableView })
      if ((await tableView.count()) > 0) {
        await tableView.first().click()
        await page.waitForTimeout(2000)
      }
      await page.waitForFunction(
        () => document.querySelectorAll('table tbody tr').length >= 2,
        { timeout: 30_000 },
      )
      await assertNoDevIssues(page, `${locale} accounts table desktop`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    case 'widgets-mobile': {
      const page = await browser.newPage({
        locale: playwrightLocale,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      })
      await waitForDashboard(page, locale, siteUrl)
      await clickTab(page, LABELS[locale].widgetsTab)
      await page.waitForTimeout(2500)
      await assertNoDevIssues(page, `${locale} widgets mobile`)
      await screenshot(page, batch, locale, file)
      await page.close()
      return
    }

    default:
      throw new Error(`Unknown changelog scene: ${scene}`)
  }
}
