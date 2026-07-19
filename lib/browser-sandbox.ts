/**
 * Browser automation for Vercel production via agent-browser + Sandbox.
 *
 * Uses `@agent-browser/sandbox` so Chrome runs inside a Vercel Sandbox microVM.
 * That avoids Playwright `connectOverCDP` over the public sandbox WSS URL
 * (Chrome rejects non-localhost Host headers) and can wait through Cloudflare
 * interstitials that plain `--dump-dom` cannot.
 *
 * Optional: set `AGENT_BROWSER_SNAPSHOT_ID` to boot from a prebuilt snapshot
 * (skips ~30s cold install of system deps + Chrome).
 *
 * Docs: https://agent-browser.dev/next
 * Package: https://github.com/vercel-labs/agent-browser
 */

import {
  runAgentBrowserCommand,
  withAgentBrowserSandbox,
  type VercelSandboxSession,
} from '@agent-browser/sandbox/vercel'

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000

function onStep(event: { step: string; status: string; elapsed?: number }) {
  const elapsed = event.elapsed != null ? ` (${event.elapsed}ms)` : ''
  console.log(`[agent-browser] ${event.step}: ${event.status}${elapsed}`)
}

async function waitForInvestingCalendar(sandbox: VercelSandboxSession) {
  // Give Cloudflare's JS challenge time to resolve before asserting content.
  for (let attempt = 0; attempt < 12; attempt++) {
    const titleResult = await runAgentBrowserCommand(
      sandbox,
      ['get', 'title'],
      { json: false, stepLabel: `Read document title (attempt ${attempt + 1})` },
    )
    const title = titleResult.stdout.trim()
    console.log(`Page title: ${title}`)

    if (title && !/just a moment/i.test(title)) {
      break
    }

    await runAgentBrowserCommand(
      sandbox,
      ['wait', '3000'],
      { json: false, stepLabel: 'Wait for Cloudflare challenge' },
    )
  }

  // Calendar rows use ids like eventRowId_123; date headers use td.theDay.
  await runAgentBrowserCommand(
    sandbox,
    ['wait', '[id*="eventRowId_"], td.theDay'],
    { json: false, stepLabel: 'Wait for calendar rows' },
  )
}

async function getPageHtml(sandbox: VercelSandboxSession): Promise<string> {
  const result = await runAgentBrowserCommand(
    sandbox,
    ['eval', 'document.documentElement.outerHTML'],
    { json: false, stepLabel: 'Extract page HTML' },
  )

  let html = result.stdout.trim()
  // eval may wrap the string in JSON quotes when the daemon returns JSON-ish output
  if (
    (html.startsWith('"') && html.endsWith('"')) ||
    (html.startsWith("'") && html.endsWith("'"))
  ) {
    try {
      html = JSON.parse(html)
    } catch {
      // keep raw stdout
    }
  }

  if (!html || html.length < 100) {
    throw new Error(
      `agent-browser returned empty/short HTML (length=${html?.length ?? 0})`,
    )
  }

  return html
}

/**
 * Scrape one or more URLs in a single Sandbox session (one Chrome install).
 */
export async function scrapeUrlsWithAgentBrowser(
  urls: string[],
  options: {
    userAgent?: string
    timeoutMs?: number
  } = {},
): Promise<string[]> {
  if (urls.length === 0) return []

  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

  if (!isProduction) {
    // Local/dev: fall back to Playwright when not on Vercel.
    return scrapeUrlsWithLocalPlaywright(urls, options)
  }

  return withAgentBrowserSandbox(
    async (sandbox) => {
      const pages: string[] = []

      for (const url of urls) {
        console.log(`Navigating to ${url} with agent-browser...`)
        await runAgentBrowserCommand(
          sandbox,
          [
            '--user-agent',
            options.userAgent || DEFAULT_USER_AGENT,
            'open',
            url,
          ],
          { json: false, stepLabel: `Open ${url}` },
        )

        await waitForInvestingCalendar(sandbox)
        const html = await getPageHtml(sandbox)
        console.log(`HTML length for ${url}:`, html.length)

        if (/just a moment/i.test(html) && !html.includes('eventRowId_')) {
          throw new Error(
            `Cloudflare challenge still present after wait for ${url}`,
          )
        }

        pages.push(html)
      }

      await runAgentBrowserCommand(sandbox, ['close'], {
        json: false,
        stepLabel: 'Close browser',
      })

      return pages
    },
    {
      timeout: options.timeoutMs ?? SANDBOX_TIMEOUT_MS,
      onStep,
      // Prefer snapshot when configured via AGENT_BROWSER_SNAPSHOT_ID.
    },
  )
}

export async function scrapeWithSandbox(
  url: string,
  options: {
    waitFor?: string
    timeout?: number
    userAgent?: string
  } = {},
): Promise<string> {
  const [html] = await scrapeUrlsWithAgentBrowser([url], {
    userAgent: options.userAgent,
    timeoutMs: options.timeout,
  })
  return html
}

async function getChromium() {
  const { chromium } = await import('playwright-core')
  return chromium
}

async function scrapeUrlsWithLocalPlaywright(
  urls: string[],
  options: {
    userAgent?: string
    timeoutMs?: number
  } = {},
): Promise<string[]> {
  console.log('Development mode: Using local Playwright browser...')
  const chromium = await getChromium()
  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext({
      userAgent: options.userAgent || DEFAULT_USER_AGENT,
    })
    const pages: string[] = []

    for (const url of urls) {
      const page = await context.newPage()
      console.log(`Navigating to ${url} with local browser...`)
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeoutMs || 60_000,
      })

      if (!response || !response.ok()) {
        throw new Error(
          `Navigation failed! status: ${response?.status()} - ${response?.statusText()}`,
        )
      }

      await page
        .waitForSelector('[id*="eventRowId_"], td.theDay', { timeout: 30_000 })
        .catch(() => {
          console.log(
            'Warning: calendar selectors not found locally, continuing anyway',
          )
        })

      const html = await page.content()
      console.log(`HTML length for ${url}:`, html.length)
      pages.push(html)
      await page.close()
    }

    return pages
  } finally {
    await browser.close()
  }
}
