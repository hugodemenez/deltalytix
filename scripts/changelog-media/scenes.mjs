import {
  assertNoDevIssues,
  clickTab,
  dismissCookies,
  ensureCookiesDismissed,
  injectBillingPaymentHistoryMock,
  newCapturePage,
  recordVideo,
  screenshot,
  waitForDashboard,
} from './helpers.mjs'
import { LABELS, viewport } from './constants.mjs'

/** @typedef {'landing-hero' | 'landing-scroll' | 'landing-contribution-graph' | 'landing-contribution-graph-hover' | 'landing-ai-journaling-demo' | 'landing-features-carousel' | 'landing-navbar-updates' | 'landing-faq-expanded' | 'landing-pricing-stability' | 'import-mobile' | 'support' | 'trade-table-mobile' | 'trade-table-desktop' | 'trade-table-scroll-video' | 'calendar-widgets' | 'calendar-table' | 'accounts-mobile' | 'accounts-table-desktop' | 'widgets-mobile' | 'billing-mobile'} ChangelogScene */

/**
 * @param {import('playwright-core').Browser} browser
 * @param {{ batch: string, locale: string, file: string, scene: ChangelogScene, siteUrl: string, playwrightLocale: string }} options
 */
export async function captureScene(browser, options) {
  const { batch, locale, file, scene, siteUrl, playwrightLocale } = options

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

    default:
      throw new Error(`Unknown changelog scene: ${scene}`)
  }
}
