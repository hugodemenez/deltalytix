import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { LABELS, viewport, BILLING_CAPTURE_MOCK } from './constants.mjs'

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

const NEXT_DEV_TOOL_SELECTORS = [
  'nextjs-portal',
  'next-route-announcer',
  '#__next-build-watcher',
].join(', ')

/** Keep the Next.js dev tools badge/menu out of changelog screenshots. */
export async function seedHideNextDevTools(page) {
  await page.addInitScript((selectors) => {
    const hide = () => {
      document.querySelectorAll(selectors).forEach((element) => {
        element.remove()
      })

      document.querySelectorAll('nextjs-portal').forEach((portal) => {
        portal.shadowRoot
          ?.querySelectorAll('[data-next-badge], #next-logo, [data-nextjs-dev-tools-button]')
          .forEach((node) => {
            node.remove()
          })
      })
    }

    hide()

    const observer = new MutationObserver(hide)
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }, NEXT_DEV_TOOL_SELECTORS)
}

export async function hideNextDevTools(page) {
  await page.evaluate((selectors) => {
    document.querySelectorAll(selectors).forEach((element) => {
      element.remove()
    })

    document.querySelectorAll('nextjs-portal').forEach((portal) => {
      portal.shadowRoot
        ?.querySelectorAll('[data-next-badge], #next-logo, [data-nextjs-dev-tools-button]')
        .forEach((node) => {
          node.remove()
        })
      portal.remove()
    })
  }, NEXT_DEV_TOOL_SELECTORS)
}

export async function newCapturePage(browser, options = {}) {
  const page = await browser.newPage(options)
  await seedCookieConsent(page)
  await seedHideNextDevTools(page)
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

export async function assertNoVisibleDevTools(page) {
  const visible = await page.evaluate(() => {
    const portal = document.querySelector('nextjs-portal')
    if (!portal) return false
    const hostRect = portal.getBoundingClientRect()
    if (hostRect.width > 0 && hostRect.height > 0) return true

    const logo = portal.shadowRoot?.querySelector('#next-logo, [data-nextjs-dev-tools-button], [data-next-badge]')
    if (!logo) return false
    const logoRect = logo.getBoundingClientRect()
    return logoRect.width > 0 && logoRect.height > 0
  })

  if (visible) {
    await hideNextDevTools(page)
  }

  const stillVisible = await page.evaluate(() => {
    const portal = document.querySelector('nextjs-portal')
    if (!portal) return false
    const rect = portal.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  })

  if (stillVisible) {
    throw new Error('Next.js dev tools are still visible before screenshot')
  }
}

export async function assertNoDevIssues(page, context) {
  await page.waitForTimeout(1500)
  const issueCount = await page.evaluate(() => {
    const portal = document.querySelector('nextjs-portal')
    const badges = portal?.shadowRoot?.querySelectorAll('[data-next-badge][data-error="true"]') ?? []
    return Array.from(badges).filter((badge) => {
      const rect = badge.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }).length
  })
  if (issueCount > 0) {
    const overlay = await page.locator('nextjs-portal').innerText().catch(() => 'unknown issue')
    throw new Error(`Next.js dev issue on ${context}: ${overlay.slice(0, 500)}`)
  }
}

export async function injectBillingPaymentHistoryMock(page, locale) {
  const mock = BILLING_CAPTURE_MOCK[locale]
  await page.evaluate((data) => {
    const card = Array.from(document.querySelectorAll('.rounded-lg.border.bg-card.overflow-hidden')).find(
      (element) =>
        /no payment history|aucun historique/i.test(element.textContent ?? ''),
    )
    if (!card) return

    const row = (invoice) => `
      <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0 space-y-1">
          <p class="text-sm font-medium">${invoice.amount}</p>
          <p class="text-sm text-muted-foreground">${invoice.date}</p>
        </div>
        <div class="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
          <span class="w-fit rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">${data.paid}</span>
          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" class="inline-flex h-8 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium sm:w-auto">${data.viewInvoice}</button>
            <button type="button" class="inline-flex h-8 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium sm:w-auto">${data.downloadPdf}</button>
          </div>
        </div>
      </div>`

    card.innerHTML = `<div class="divide-y overflow-hidden">${data.invoices.map(row).join('')}</div>`
  }, mock)
}

export async function waitForDashboard(page, locale, siteUrl) {
  await seedCookieConsent(page)
  await seedHideNextDevTools(page)
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
  await hideNextDevTools(page)
  await assertNoDevIssues(page, `${locale} dashboard`)
}

export async function clickTab(page, pattern) {
  const tab = page.getByRole('tab', { name: pattern })
  await tab.first().click()
  await page.waitForTimeout(1500)
}

export async function prepareForScreenshot(page) {
  await hideNextDevTools(page)
  await assertNoVisibleDevTools(page)
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
  await context.addInitScript((selectors) => {
    const hide = () => {
      document.querySelectorAll(selectors).forEach((element) => {
        element.remove()
      })

      document.querySelectorAll('nextjs-portal').forEach((portal) => {
        portal.shadowRoot
          ?.querySelectorAll('[data-next-badge], #next-logo, [data-nextjs-dev-tools-button]')
          .forEach((node) => {
            node.remove()
          })
        portal.remove()
      })
    }

    hide()

    const observer = new MutationObserver(hide)
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }, NEXT_DEV_TOOL_SELECTORS)
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
