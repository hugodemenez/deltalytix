import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
const DASHBOARD_URL = `${SITE_URL}/en/dashboard`
const OUTPUT_DIR =
  process.env.VIDEO_OUTPUT_DIR || '/opt/cursor/artifacts/videos'

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

async function dismissCookies(page) {
  const accept = page.getByRole('button', { name: /accept all/i })
  if ((await accept.count()) > 0) {
    await accept.first().click()
    await page.waitForTimeout(800)
  }
}

async function waitForDashboardData(page) {
  await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await dismissCookies(page)

  // Trades/charts hydrate asynchronously after first paint.
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? ''
      const charts = document.querySelectorAll('svg.recharts-surface').length
      return text.includes('LOCAL-SIM-001') && charts >= 5 && /Trade Distribution|Equity/i.test(text)
    },
    { timeout: 90_000 },
  )

  // Let equity + widget layout finish animating.
  await page.waitForTimeout(4000)
}

async function clickTab(page, pattern) {
  const tab = page.getByRole('tab', { name: pattern })
  await tab.first().click()
  await page.waitForTimeout(1500)
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  })

  const page = await context.newPage()
  await waitForDashboardData(page)

  // Widgets — scroll through key sections slowly
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(2500)

  for (const y of [0, 500, 1000, 1500, 2200, 1200, 400]) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(3000)
  }

  // Table tab — wait for trade rows
  await clickTab(page, /^table$/i)
  await page.waitForFunction(
    () => document.querySelectorAll('table tbody tr').length >= 5,
    { timeout: 30_000 },
  )
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(3500)

  // Accounts tab — wait for account card
  await clickTab(page, /^accounts$/i)
  await page.waitForFunction(
    () => (document.body?.innerText ?? '').includes('LOCAL-SIM-001'),
    { timeout: 30_000 },
  )
  await page.waitForTimeout(4500)

  // Back to widgets for closing shot on charts
  await clickTab(page, /^widgets$/i)
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.waitForTimeout(3500)

  const video = page.video()
  await page.close()
  await context.close()
  await browser.close()

  if (!video) throw new Error('No video recording was created')

  const webmPath = await video.path()
  const stamp = Date.now()
  const webmOut = path.join(OUTPUT_DIR, `deltalytix-dashboard-demo-${stamp}.webm`)
  fs.renameSync(webmPath, webmOut)

  const mp4Out = path.join(OUTPUT_DIR, 'deltalytix-dashboard-demo.mp4')
  const { execSync } = await import('child_process')
  execSync(
    `ffmpeg -y -i "${webmOut}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4Out}"`,
    { stdio: 'inherit' },
  )

  const verifyPage = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const verify = await verifyPage.newPage()
  // Grab a still from the mp4 isn't trivial; verify live page one more time
  await verify.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 120000 })
  await verify.waitForTimeout(10000)
  const snapshot = {
    charts: await verify.locator('svg.recharts-surface').count(),
    tableRows: await verify.locator('table tbody tr').count(),
    hasAccount: (await verify.locator('body').innerText()).includes('LOCAL-SIM-001'),
  }
  await verifyPage.close()

  console.log(
    JSON.stringify(
      {
        webm: webmOut,
        mp4: mp4Out,
        mp4Bytes: fs.statSync(mp4Out).size,
        verify: snapshot,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
