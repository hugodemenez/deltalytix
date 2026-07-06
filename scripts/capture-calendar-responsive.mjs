#!/usr/bin/env node
/**
 * Capture calendar widget screenshots at mobile and desktop viewports.
 * Usage: node scripts/capture-calendar-responsive.mjs
 */
import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright-core'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const READY_MARKER = process.env.CALENDAR_CAPTURE_READY_MARKER || 'LOCAL-SIM-001'
const OUT_DIR = path.join(process.cwd(), 'public', 'updates', 'calendar-responsive-preview')

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
]

async function dismissCookies(page) {
  const accept = page.getByRole('button', { name: /accept all|accept cookies|accept/i })
  if ((await accept.count()) > 0) {
    await accept.first().click({ force: true })
    await page.waitForTimeout(800)
  }
}

async function waitForDashboard(page) {
  await page.goto(`${SITE_URL}/en/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  })
  await dismissCookies(page)
  await page.waitForFunction(
    (marker) => {
      const text = document.body?.innerText ?? ''
      return text.includes(marker)
    },
    READY_MARKER,
    { timeout: 90_000 },
  )
  await page.waitForTimeout(2000)
}

async function scrollToCalendar(page, isMobileCarousel) {
  if (isMobileCarousel) {
    const calendarTab = page.getByRole('tab', { name: /calendar/i }).first()
    if ((await calendarTab.count()) > 0) {
      await calendarTab.click({ force: true })
      await page.waitForTimeout(1500)
      return
    }
  }

  const calendarTitle = page.locator('[data-widget-type="calendarWidget"], .react-grid-item').filter({
    has: page.getByText(/calendar view/i),
  }).first()

  if ((await calendarTitle.count()) > 0) {
    await calendarTitle.scrollIntoViewIfNeeded()
  } else {
    const heading = page.getByText(/calendar view/i).first()
    if ((await heading.count()) > 0) {
      await heading.scrollIntoViewIfNeeded()
    } else {
      await page.evaluate(() => window.scrollTo(0, 600))
    }
  }
  await page.waitForTimeout(1500)
}

async function captureCalendarWidget(page, viewportName, isMobileCarousel) {
  let target
  if (isMobileCarousel) {
    const slide = page.locator('[id^="mobile-widget-slide-"]').filter({
      has: page.getByText(/daily view|weekly view/i),
    }).first()
    target = (await slide.count()) > 0 ? slide : page.locator('body')
  } else {
    const widget = page.locator('.react-grid-item').filter({
      has: page.getByText(/calendar view/i),
    }).first()
    target = (await widget.count()) > 0 ? widget : page.locator('body')
  }

  const outPath = path.join(OUT_DIR, `${viewportName}.png`)
  await target.screenshot({ path: outPath, type: 'png' })
  console.log(`Saved ${outPath}`)
  return outPath
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      locale: 'en-US',
    })
    await waitForDashboard(page)
    await scrollToCalendar(page, vp.width < 640)
    await captureCalendarWidget(page, vp.name, vp.width < 640)
    await page.close()
  }

  await browser.close()
  console.log(`\nScreenshots saved to ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
