import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { LABELS, viewport } from './constants.mjs'

const COOKIE_CONSENT_VALUE = JSON.stringify({
  analytics_storage: true,
  ad_storage: true,
  ad_user_data: true,
  ad_personalization: true,
  functionality_storage: true,
  personalization_storage: true,
  security_storage: true,
})

export function outputRoot(batch) {
  return path.join(process.cwd(), 'public', 'updates', batch)
}

export function outputDir(batch, locale) {
  const dir = path.join(outputRoot(batch), locale)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** Seed consent before navigation so the banner never renders. */
export async function seedCookieConsent(page) {
  await page.addInitScript((consentValue) => {
    window.localStorage.setItem('cookieConsent', consentValue)
  }, COOKIE_CONSENT_VALUE)
}

export async function newCapturePage(browser, options = {}) {
  const page = await browser.newPage(options)
  await seedCookieConsent(page)
  return page
}

export async function dismissCookies(page, locale) {
  const accept = page.getByRole('button', { name: LABELS[locale].acceptCookies })
  try {
    const button = accept.first()
    await button.waitFor({ state: 'visible', timeout: 8_000 })
    await button.click({ force: true })
    await page.waitForFunction(
      () => !document.body.hasAttribute('data-consent-banner'),
      { timeout: 5_000 },
    )
    await page.waitForTimeout(400)
    return
  } catch {
    // Banner may already be dismissed via seeded localStorage.
  }

  await page.evaluate((consentValue) => {
    window.localStorage.setItem('cookieConsent', consentValue)
    document.body.removeAttribute('data-consent-banner')
  }, COOKIE_CONSENT_VALUE)
  await page.waitForTimeout(400)
}

export async function ensureCookiesDismissed(page, locale) {
  await dismissCookies(page, locale)
  await page.waitForFunction(
    () => !document.body.hasAttribute('data-consent-banner'),
    { timeout: 5_000 },
  ).catch(() => {})
}

export async function assertNoDevIssues(page, context) {
  await page.waitForTimeout(1500)
  const errorBadgeCount = await page.locator('[data-next-badge][data-error="true"]').count()
  if (errorBadgeCount > 0) {
    await page.locator('[data-issues-open]').first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(500)
    const overlay = await page.locator('nextjs-portal').innerText().catch(() => 'unknown issue')
    throw new Error(`Next.js dev issue on ${context}: ${overlay.slice(0, 500)}`)
  }
}

export async function waitForDashboard(page, locale, siteUrl) {
  await seedCookieConsent(page)
  await page.goto(`${siteUrl}/${locale}/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  })
  await dismissCookies(page, locale)
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? ''
      const charts = document.querySelectorAll('svg.recharts-surface').length
      const minCharts = window.innerWidth < 768 ? 1 : 3
      return text.includes('LOCAL-SIM-001') && charts >= minCharts
    },
    { timeout: 90_000 },
  )
  await page.waitForTimeout(2500)
  await ensureCookiesDismissed(page, locale)
  await assertNoDevIssues(page, `${locale} dashboard`)
}

export async function clickTab(page, pattern) {
  const tab = page.getByRole('tab', { name: pattern })
  await tab.first().click()
  await page.waitForTimeout(1500)
}

export async function prepareForScreenshot(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }
  })
  await page.waitForTimeout(300)
}

export async function screenshot(page, batch, locale, name) {
  await ensureCookiesDismissed(page, locale)
  await prepareForScreenshot(page)
  const out = path.join(outputDir(batch, locale), `${name}.png`)
  await page.screenshot({
    path: out,
    type: 'png',
    fullPage: false,
    scale: 'device',
    animations: 'disabled',
  })
  console.log('Saved', out)
  return out
}

export async function recordVideo(browser, batch, locale, name, run, playwrightLocale) {
  const videoContext = viewport('desktop')
  const recordWidth = videoContext.viewport.width
  const recordHeight = videoContext.viewport.height
  const context = await browser.newContext({
    locale: playwrightLocale,
    ...videoContext,
    recordVideo: {
      dir: outputDir(batch, locale),
      size: { width: recordWidth, height: recordHeight },
    },
  })
  await context.addInitScript((consentValue) => {
    window.localStorage.setItem('cookieConsent', consentValue)
  }, COOKIE_CONSENT_VALUE)
  const page = await context.newPage()
  await run(page)
  const video = page.video()
  await page.close()
  await context.close()

  if (!video) throw new Error(`No video recorded for ${locale}/${name}`)

  const webmPath = await video.path()
  const webmOut = path.join(outputDir(batch, locale), `${name}.webm`)
  fs.renameSync(webmPath, webmOut)

  const mp4Out = path.join(outputDir(batch, locale), `${name}.mp4`)
  execSync(
    `ffmpeg -y -i "${webmOut}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4Out}"`,
    { stdio: 'pipe' },
  )
  fs.unlinkSync(webmOut)
  console.log('Saved', mp4Out)
  return mp4Out
}
