#!/usr/bin/env node
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright-core'
import { LOCALES, PLAYWRIGHT_LOCALE, SITE_URL } from './constants.mjs'
import { captureScene } from './scenes.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
process.chdir(repoRoot)

const batch = 'pr-298'
const siteUrl = process.env.SITE_URL || SITE_URL

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

try {
  for (const locale of LOCALES) {
    console.log(`→ billing-mobile (${locale})`)
    await captureScene(browser, {
      batch,
      locale,
      file: 'billing-payment-history-mobile-layout',
      scene: 'billing-mobile',
      siteUrl,
      playwrightLocale: PLAYWRIGHT_LOCALE[locale],
    })
  }
} finally {
  await browser.close()
}
