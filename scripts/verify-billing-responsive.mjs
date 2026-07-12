#!/usr/bin/env node
/**
 * Verify billing payment history has no horizontal overflow on mobile.
 * Usage: node scripts/verify-billing-responsive.mjs
 */
import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright-core'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const LOCALE = process.env.BILLING_VERIFY_LOCALE || 'fr'
const OUT_DIR = path.join(process.cwd(), 'public', 'updates', 'billing-responsive-preview')

const MOBILE_VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 812 },
  { name: 'iphone-14', width: 390, height: 844 },
]

async function dismissCookies(page) {
  const accept = page.getByRole('button', { name: /accept all|accept cookies|accept|tout accepter/i })
  if ((await accept.count()) > 0) {
    await accept.first().click({ force: true })
    await page.waitForTimeout(500)
  }
}

async function waitForBillingPage(page) {
  await page.goto(`${SITE_URL}/${LOCALE}/dashboard/billing`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  })
  await dismissCookies(page)

  const paymentHistoryHeading = page.getByRole('heading', {
    name: /historique des paiements|payment history/i,
  })
  await paymentHistoryHeading.waitFor({ state: 'visible', timeout: 90_000 })
  await page.waitForTimeout(1500)
}

async function assertNoHorizontalOverflow(page, viewportName) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    return {
      scrollWidth: Math.max(doc.scrollWidth, body?.scrollWidth ?? 0),
      clientWidth: doc.clientWidth,
    }
  })

  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    throw new Error(
      `Horizontal overflow on ${viewportName}: scrollWidth=${metrics.scrollWidth}, clientWidth=${metrics.clientWidth}`,
    )
  }

  console.log(`✓ No overflow on ${viewportName} (${metrics.clientWidth}px wide)`)
}

async function capturePaymentHistory(page, viewportName) {
  const section = page.locator('div').filter({
    has: page.getByRole('heading', { name: /historique des paiements|payment history/i }),
  }).first()

  const target = (await section.count()) > 0 ? section : page.locator('body')
  const outPath = path.join(OUT_DIR, `${viewportName}.png`)
  await target.screenshot({ path: outPath, type: 'png' })
  console.log(`Saved ${outPath}`)
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  for (const vp of MOBILE_VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      locale: LOCALE === 'fr' ? 'fr-FR' : 'en-US',
    })

    await waitForBillingPage(page)
    await assertNoHorizontalOverflow(page, vp.name)
    await capturePaymentHistory(page, vp.name)
    await page.close()
  }

  await browser.close()
  console.log(`\nBilling responsive checks passed. Screenshots in ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
