/**
 * Capture screenshots and short demo videos for PR #249 changelog entries.
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
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'updates', 'pr-249')

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

async function dismissCookies(page) {
  const accept = page.getByRole('button', { name: /accept all/i })
  if ((await accept.count()) > 0) {
    await accept.first().click({ force: true })
    await page.waitForTimeout(600)
  }

  const consentDrawer = page.locator('[class*="fixed bottom-0"]').filter({ hasText: /cookie|consent/i })
  if ((await consentDrawer.count()) > 0) {
    const acceptInDrawer = consentDrawer.getByRole('button', { name: /accept all/i })
    if ((await acceptInDrawer.count()) > 0) {
      await acceptInDrawer.first().click({ force: true })
      await page.waitForTimeout(600)
    }
  }
}

async function waitForDashboard(page) {
  await page.goto(`${SITE_URL}/en/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  })
  await dismissCookies(page)
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? ''
      const charts = document.querySelectorAll('svg.recharts-surface').length
      return text.includes('LOCAL-SIM-001') && charts >= 3
    },
    { timeout: 90_000 },
  )
  await page.waitForTimeout(2500)
}

async function clickTab(page, pattern) {
  const tab = page.getByRole('tab', { name: pattern })
  await tab.first().click()
  await page.waitForTimeout(1500)
}

async function screenshot(page, name) {
  const out = path.join(OUTPUT_DIR, `${name}.png`)
  await page.screenshot({ path: out, type: 'png', fullPage: false })
  console.log('Saved', out)
  return out
}

async function recordVideo(browser, name, run) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1280, height: 720 },
    },
  })
  const page = await context.newPage()
  await run(page)
  const video = page.video()
  await page.close()
  await context.close()

  if (!video) throw new Error(`No video recorded for ${name}`)

  const webmPath = await video.path()
  const webmOut = path.join(OUTPUT_DIR, `${name}.webm`)
  fs.renameSync(webmPath, webmOut)

  const mp4Out = path.join(OUTPUT_DIR, `${name}.mp4`)
  execSync(
    `ffmpeg -y -i "${webmOut}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4Out}"`,
    { stdio: 'pipe' },
  )
  console.log('Saved', mp4Out)
  return mp4Out
}

async function captureLanding(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${SITE_URL}/en`, { waitUntil: 'networkidle', timeout: 120_000 })
  await dismissCookies(page)
  await page.waitForTimeout(3000)
  await screenshot(page, 'faster-landing-page')
  await page.close()

  await recordVideo(browser, 'faster-landing-page-demo', async (page) => {
    await page.goto(`${SITE_URL}/en`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
    await dismissCookies(page)
    await page.waitForTimeout(2000)
    for (const y of [0, 700, 1400, 2100, 1200, 0]) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
      await page.waitForTimeout(1800)
    }
  })
}

async function captureImportMobile(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await waitForDashboard(page)
  const importBtn = page.getByRole('button', { name: /import/i })
  await importBtn.first().click()
  await page.waitForSelector('[role="dialog"]', { timeout: 15_000 })
  await page.waitForTimeout(1200)
  await screenshot(page, 'import-from-mobile')
  await page.keyboard.press('Escape')
  await page.close()
}

async function captureSupportAssistant(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${SITE_URL}/en/support`, { waitUntil: 'networkidle', timeout: 120_000 })
  await dismissCookies(page)
  await page.waitForTimeout(2500)
  await screenshot(page, 'support-assistant-codebase-search')
  await page.close()
}

async function captureTradeTable(browser) {
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await waitForDashboard(mobile)
  await clickTab(mobile, /^table$/i)
  await mobile.waitForFunction(
    () => document.querySelectorAll('table tbody tr').length >= 3,
    { timeout: 30_000 },
  )
  await mobile.waitForTimeout(1200)
  await screenshot(mobile, 'trade-table-mobile-and-show-all-mobile')
  await mobile.close()

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await waitForDashboard(desktop)
  await clickTab(desktop, /^table$/i)
  await desktop.waitForFunction(
    () => document.querySelectorAll('table tbody tr').length >= 5,
    { timeout: 30_000 },
  )

  const showAll = desktop.getByRole('button', { name: /show all/i })
  if ((await showAll.count()) > 0) {
    await dismissCookies(desktop)
    await showAll.first().click({ force: true })
    await desktop.waitForTimeout(2000)
  }

  await recordVideo(browser, 'trade-table-show-all-demo', async (page) => {
    await waitForDashboard(page)
    await clickTab(page, /^table$/i)
    await page.waitForFunction(
      () => document.querySelectorAll('table tbody tr').length >= 5,
      { timeout: 30_000 },
    )
    const showAllBtn = page.getByRole('button', { name: /show all/i })
    if ((await showAllBtn.count()) > 0) {
      await dismissCookies(page)
      await showAllBtn.first().click({ force: true })
      await page.waitForTimeout(1500)
    }
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 500))
      await page.waitForTimeout(900)
    }
  })

  await screenshot(desktop, 'trade-table-mobile-and-show-all')
  await desktop.close()
}

async function captureCalendarTimezone(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await waitForDashboard(page)

  const calendarHeading = page.getByText(/calendar view|vue calendrier/i).first()
  if ((await calendarHeading.count()) > 0) {
    await calendarHeading.scrollIntoViewIfNeeded()
  } else {
    await page.evaluate(() => window.scrollTo(0, 900))
  }
  await page.waitForTimeout(2000)
  await screenshot(page, 'calendar-table-timezone-date-fix-widgets')

  await clickTab(page, /^table$/i)
  await page.waitForFunction(
    () => document.querySelectorAll('table tbody tr').length >= 3,
    { timeout: 30_000 },
  )
  await page.waitForTimeout(1200)
  await screenshot(page, 'calendar-table-timezone-date-fix-table')
  await page.close()
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    await captureLanding(browser)
    await captureImportMobile(browser)
    await captureSupportAssistant(browser)
    await captureTradeTable(browser)
    await captureCalendarTimezone(browser)

    const files = fs.readdirSync(OUTPUT_DIR).sort()
    console.log(
      JSON.stringify(
        {
          outputDir: OUTPUT_DIR,
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
