import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { LABELS } from './constants.mjs'

export function outputRoot(batch) {
  return path.join(process.cwd(), 'public', 'updates', batch)
}

export function outputDir(batch, locale) {
  const dir = path.join(outputRoot(batch), locale)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function dismissCookies(page, locale) {
  const accept = page.getByRole('button', { name: LABELS[locale].acceptCookies })
  if ((await accept.count()) > 0) {
    await accept.first().click({ force: true })
    await page.waitForTimeout(600)
  }
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
  await page.goto(`${siteUrl}/${locale}/dashboard`, {
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

export async function clickTab(page, pattern) {
  const tab = page.getByRole('tab', { name: pattern })
  await tab.first().click()
  await page.waitForTimeout(1500)
}

export async function screenshot(page, batch, locale, name) {
  const out = path.join(outputDir(batch, locale), `${name}.png`)
  await page.screenshot({ path: out, type: 'png', fullPage: false })
  console.log('Saved', out)
  return out
}

export async function recordVideo(browser, batch, locale, name, run, playwrightLocale) {
  const context = await browser.newContext({
    locale: playwrightLocale,
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir(batch, locale),
      size: { width: 1280, height: 720 },
    },
  })
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
