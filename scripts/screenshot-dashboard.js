/**
 * Screenshot localhost:3000/dashboard at 3 resolutions (auth required).
 *
 * Usage:
 *
 * 1) CONNECT MODE (recommended – you are already on the dashboard):
 *    - Start Chrome with remote debugging:
 *      macOS: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
 *      Win:   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
 *    - In that browser: go to http://localhost:3000, log in, open /dashboard.
 *    - When ready: CONNECT_MODE=1 node scripts/screenshot-dashboard.js
 *
 * 2) LAUNCH MODE (script opens a browser; first time you log in manually):
 *    - Run: node scripts/screenshot-dashboard.js
 *    - Browser opens on /dashboard; if redirected to login, log in (script waits 60s).
 *    - Script then takes 3 screenshots. Next runs reuse the saved session.
 */

import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

function waitForInput(message = 'Press Enter to capture again (or type q + Enter to quit)... ') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close()
      resolve((answer || '').trim().toLowerCase() === 'q')
    })
  })
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000'
const DASHBOARD_URL = `${SITE_URL}/dashboard`
const CONNECT_MODE = process.env.CONNECT_MODE === '1' || process.env.CONNECT_MODE === 'true'
const BROWSER_WS = process.env.BROWSER_WS || 'http://localhost:9222'
const WAIT_FOR_LOGIN_MS = 60_000

const RESOLUTIONS = [
  { width: 1670, height: 1408, name: 'dashboard-1670x1408.webp' },
  { width: 2000, height: 1408, name: 'dashboard-2000x1408.webp' },
  { width: 1400, height: 1200, name: 'dashboard-1400x1200.webp' },
]

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'img', 'screenshots')
const USER_DATA_DIR = path.join(__dirname, '..', '.puppeteer-dashboard-session')

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
}

async function connectToBrowser() {
  const browserURL = BROWSER_WS.startsWith('http') ? BROWSER_WS : `http://${BROWSER_WS}`
  const browser = await puppeteer.connect({
    browserURL,
  })
  const pages = await browser.pages()
  const dashboardPage = pages.find((p) => {
    try {
      return p.url().includes('/dashboard') || p.url().includes('localhost:3000')
    } catch {
      return false
    }
  })
  const page = dashboardPage || pages[0]
  if (!dashboardPage) {
    console.log('No tab on /dashboard found; using first tab. Navigate to dashboard and run again if needed.')
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
  }
  return { browser, page, owned: false }
}

async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: USER_DATA_DIR,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
  })
  const page = (await browser.pages())[0] || (await browser.newPage())
  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})

  const currentUrl = page.url()
  const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/sign-in') || currentUrl.includes('auth')

  if (isLoginPage) {
    console.log('Redirected to login. Log in manually in the browser window; script will continue in', WAIT_FOR_LOGIN_MS / 1000, 'seconds...')
    await new Promise((r) => setTimeout(r, WAIT_FOR_LOGIN_MS))
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
  }
  else{
    // Wait for the page to load
    await new Promise((r) => setTimeout(r, 60000)) // small delay for responsive layout to settle
  }

  return { browser, page, owned: true }
}

async function main() {
  await ensureOutputDir()

  let browser, page, owned

  try {
    if (CONNECT_MODE) {
      console.log('Connect mode: attaching to browser at', BROWSER_WS)
      const result = await connectToBrowser()
      browser = result.browser
      page = result.page
      owned = result.owned
    } else {
      throw new Error('Launch mode')
    }
  } catch (err) {
    const connectFailed = CONNECT_MODE && (
      err?.cause?.code === 'ECONNREFUSED' ||
      err?.message?.includes('Failed to fetch browser webSocket URL')
    )
    if (connectFailed) {
      console.log('Could not connect to browser, launching instead...')
    }
    const result = await launchBrowser()
    browser = result.browser
    page = result.page
    owned = result.owned
  }

  for (;;) {
    for (const res of RESOLUTIONS) {
      await page.setViewport({ width: res.width, height: res.height, deviceScaleFactor: 1 })
      await new Promise((r) => setTimeout(r, 2000))
      const outPath = path.join(OUTPUT_DIR, res.name)
      await page.screenshot({ path: outPath, type: 'webp', quality: 80 })
      console.log('Saved', outPath)
    }
    console.log('Done.')
    const quit = await waitForInput()
    if (quit) break
  }

  if (owned && browser) {
    await browser.close()
  }
  console.log('Bye.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
