/**
 * Capture screenshots and short demo videos for PR #249 changelog entries.
 *
 * Captures separate EN and FR assets under public/updates/pr-249/{locale}/.
 *
 * Prerequisites:
 *   - Dev server on http://localhost:3000
 *   - Local dashboard auth bypass + seeded data (bun run seed:self-host)
 *
 * Usage:
 *   node scripts/capture-changelog-pr-249.mjs
 */

import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
const OUTPUT_ROOT = path.join(process.cwd(), 'public', 'updates', 'pr-249')
const LOCALES = ['en', 'fr']

const LABELS = {
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

fs.mkdirSync(OUTPUT_ROOT, { recursive: true })

function outputDir(locale) {
  const dir = path.join(OUTPUT_ROOT, locale)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function dismissCookies(page, locale) {
  const accept = page.getByRole('button', { name: LABELS[locale].acceptCookies })
  if ((await accept.count()) > 0) {
    await accept.first().click({ force: true })
    await page.waitForTimeout(600)
  }
}

async function assertNoDevIssues(page, context) {
  await page.waitForTimeout(1500)
  const errorBadgeCount = await page.locator('[data-next-badge][data-error="true"]').count()
  if (errorBadgeCount > 0) {
    await page.locator('[data-issues-open]').first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(500)
    const overlay = await page.locator('nextjs-portal').innerText().catch(() => 'unknown issue')
    throw new Error(`Next.js dev issue on ${context}: ${overlay.slice(0, 500)}`)
  }
}

async function waitForDashboard(page, locale) {
  await page.goto(`${SITE_URL}/${locale}/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  })
  await dismissCookies(page, locale)
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? ''
      const charts = document.querySelectorAll('svg.recharts-surface').length
      return text.includes('LOCAL-SIM-001') && charts >= 3
    },
    { timeout: 90_000 },
  )
  await page.waitForTimeout(2500)
  await assertNoDevIssues(page, `${locale} dashboard`)
}

async function clickTab(page, pattern) {
  const tab = page.getByRole('tab', { name: pattern })
  await tab.first().click()
  await page.waitForTimeout(1500)
}

async function screenshot(page, locale, name) {
  const out = path.join(outputDir(locale), `${name}.png`)
  await page.screenshot({ path: out, type: 'png', fullPage: false })
  console.log('Saved', out)
  return out
}

async function recordVideo(browser, locale, name, run) {
  const context = await browser.newContext({
    locale: locale === 'fr' ? 'fr-FR' : 'en-US',
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir(locale),
      size: { width: 1280, height: 720 },
    },
  })
  const page = await context.newPage()
  await run(page, locale)
  const video = page.video()
  await page.close()
  await context.close()

  if (!video) throw new Error(`No video recorded for ${locale}/${name}`)

  const webmPath = await video.path()
  const webmOut = path.join(outputDir(locale), `${name}.webm`)
  fs.renameSync(webmPath, webmOut)

  const mp4Out = path.join(outputDir(locale), `${name}.mp4`)
  execSync(
    `ffmpeg -y -i "${webmOut}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4Out}"`,
    { stdio: 'pipe' },
  )
  fs.unlinkSync(webmOut)
  console.log('Saved', mp4Out)
  return mp4Out
}

async function captureLanding(browser, locale) {
  const page = await browser.newPage({
    locale: locale === 'fr' ? 'fr-FR' : 'en-US',
    viewport: { width: 1440, height: 900 },
  })
  await page.goto(`${SITE_URL}/${locale}`, { waitUntil: 'networkidle', timeout: 120_000 })
  await dismissCookies(page, locale)
  await page.waitForTimeout(3000)
  await assertNoDevIssues(page, `${locale} landing`)
  await screenshot(page, locale, 'faster-landing-page')
  await page.close()

  await recordVideo(browser, locale, 'faster-landing-page-demo', async (page, loc) => {
    await page.goto(`${SITE_URL}/${loc}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await dismissCookies(page, loc)
    await page.waitForTimeout(2000)
    await assertNoDevIssues(page, `${loc} landing video`)
    for (const y of [0, 700, 1400, 2100, 1200, 0]) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
      await page.waitForTimeout(1800)
    }
  })
}

async function captureImportMobile(browser, locale) {
  const page = await browser.newPage({
    locale: locale === 'fr' ? 'fr-FR' : 'en-US',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await waitForDashboard(page, locale)
  const importBtn = page.getByRole('button', { name: LABELS[locale].import })
  await importBtn.first().click()
  await page.waitForSelector('[role="dialog"]', { timeout: 15_000 })
  await page.waitForTimeout(1200)
  await assertNoDevIssues(page, `${locale} import dialog`)
  await screenshot(page, locale, 'import-from-mobile')
  await page.keyboard.press('Escape')
  await page.close()
}

async function captureSupportAssistant(browser, locale) {
  const page = await browser.newPage({
    locale: locale === 'fr' ? 'fr-FR' : 'en-US',
    viewport: { width: 1280, height: 900 },
  })
  await page.goto(`${SITE_URL}/${locale}/support`, { waitUntil: 'networkidle', timeout: 120_000 })
  await dismissCookies(page, locale)
  await page.waitForTimeout(2500)
  await page.getByText(LABELS[locale].supportAssistant).first().waitFor({ timeout: 15_000 })
  await assertNoDevIssues(page, `${locale} support`)
  await screenshot(page, locale, 'support-assistant-codebase-search')
  await page.close()
}

async function captureTradeTable(browser, locale) {
  const mobile = await browser.newPage({
    locale: locale === 'fr' ? 'fr-FR' : 'en-US',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await waitForDashboard(mobile, locale)
  await clickTab(mobile, LABELS[locale].tableTab)
  await mobile.waitForFunction(
    () => document.querySelectorAll('table tbody tr').length >= 3,
    { timeout: 30_000 },
  )
  await mobile.waitForTimeout(1200)
  await assertNoDevIssues(mobile, `${locale} trade table mobile`)
  await screenshot(mobile, locale, 'trade-table-mobile-and-show-all-mobile')
  await mobile.close()

  const desktop = await browser.newPage({
    locale: locale === 'fr' ? 'fr-FR' : 'en-US',
    viewport: { width: 1440, height: 900 },
  })
  await waitForDashboard(desktop, locale)
  await clickTab(desktop, LABELS[locale].tableTab)
  await desktop.waitForFunction(
    () => document.querySelectorAll('table tbody tr').length >= 5,
    { timeout: 30_000 },
  )

  const showAll = desktop.getByRole('button', { name: LABELS[locale].showAll })
  if ((await showAll.count()) > 0) {
    await showAll.first().click({ force: true })
    await desktop.waitForTimeout(2000)
  }

  await recordVideo(browser, locale, 'trade-table-show-all-demo', async (page, loc) => {
    await waitForDashboard(page, loc)
    await clickTab(page, LABELS[loc].tableTab)
    await page.waitForFunction(
      () => document.querySelectorAll('table tbody tr').length >= 5,
      { timeout: 30_000 },
    )
    const showAllBtn = page.getByRole('button', { name: LABELS[loc].showAll })
    if ((await showAllBtn.count()) > 0) {
      await showAllBtn.first().click({ force: true })
      await page.waitForTimeout(1500)
    }
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 500))
      await page.waitForTimeout(900)
    }
    await assertNoDevIssues(page, `${loc} trade table video`)
  })

  await assertNoDevIssues(desktop, `${locale} trade table desktop`)
  await screenshot(desktop, locale, 'trade-table-mobile-and-show-all')
  await desktop.close()
}

async function captureCalendarTimezone(browser, locale) {
  const page = await browser.newPage({
    locale: locale === 'fr' ? 'fr-FR' : 'en-US',
    viewport: { width: 1440, height: 900 },
  })
  await waitForDashboard(page, locale)

  const calendarHeading = page.getByText(LABELS[locale].calendarView).first()
  if ((await calendarHeading.count()) > 0) {
    await calendarHeading.scrollIntoViewIfNeeded()
  } else {
    await page.evaluate(() => window.scrollTo(0, 900))
  }
  await page.waitForTimeout(2000)
  await assertNoDevIssues(page, `${locale} calendar widgets`)
  await screenshot(page, locale, 'calendar-table-timezone-date-fix-widgets')

  await clickTab(page, LABELS[locale].tableTab)
  await page.waitForFunction(
    () => document.querySelectorAll('table tbody tr').length >= 3,
    { timeout: 30_000 },
  )
  await page.waitForTimeout(1200)
  await assertNoDevIssues(page, `${locale} calendar table`)
  await screenshot(page, locale, 'calendar-table-timezone-date-fix-table')
  await page.close()
}

async function captureLocale(browser, locale) {
  console.log(`\n--- Capturing ${locale.toUpperCase()} ---`)
  await captureLanding(browser, locale)
  await captureImportMobile(browser, locale)
  await captureSupportAssistant(browser, locale)
  await captureTradeTable(browser, locale)
  await captureCalendarTimezone(browser, locale)
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    for (const locale of LOCALES) {
      await captureLocale(browser, locale)
    }

    const files = LOCALES.flatMap((locale) =>
      fs.readdirSync(outputDir(locale)).map((file) => `${locale}/${file}`),
    ).sort()

    console.log(
      JSON.stringify(
        {
          outputRoot: OUTPUT_ROOT,
          files,
        },
        null,
        2,
      ),
    )
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
