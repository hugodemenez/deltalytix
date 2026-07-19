/**
 * Browser Sandbox Utility for Vercel
 *
 * Production scraping runs Chrome entirely inside a Vercel Sandbox and returns
 * HTML via `--dump-dom`. We intentionally avoid Playwright `connectOverCDP`
 * over the public sandbox WSS URL: Chrome DevTools rejects that path with
 * "Host header is specified and is not an IP address or localhost".
 *
 * Environment Requirements:
 * - @vercel/sandbox package installed
 * - Deployed on Vercel (sandbox only works in Vercel environment)
 *
 * Usage:
 * ```typescript
 * import { scrapeWithSandbox } from '@/lib/browser-sandbox'
 *
 * const html = await scrapeWithSandbox('https://example.com', {
 *   timeout: 60000,
 *   userAgent: 'Mozilla/5.0...'
 * })
 * ```
 *
 * Based on: https://gist.github.com/sachinraja/f1125b230680849a76c6d06b4b790591
 * Official docs: https://vercel.com/docs/vercel-sandbox
 */

import { Sandbox } from "@vercel/sandbox";
import ms from 'ms';

const BROWSERS_DIR = "browsers";
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function getChromium() {
  const { chromium } = await import('playwright-core');
  return chromium;
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3) {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error("Failed to execute function after retries");
}

async function installChrome(sandbox: Sandbox) {
  console.log('Creating browsers directory...');
  await sandbox.mkDir(BROWSERS_DIR);

  const chromeRpmPath = `${BROWSERS_DIR}/google-chrome-stable_current_x86_64.rpm`;

  console.log("Downloading Chrome RPM...");
  const downloadRpm = await sandbox.runCommand({
    cmd: "curl",
    args: [
      "https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm",
      "--output",
      chromeRpmPath,
    ],
  });

  if (downloadRpm.exitCode !== 0) {
    console.error("Failed to download Chrome RPM:", await downloadRpm.stderr());
    throw new Error("Chrome RPM download failed");
  }

  console.log("Installing Chrome...");
  const installChromeCmd = await sandbox.runCommand({
    cmd: "dnf",
    args: ["install", "-y", chromeRpmPath],
    sudo: true,
  });

  if (installChromeCmd.exitCode !== 0) {
    console.error("Failed to install Chrome:", await installChromeCmd.stderr());
    throw new Error("Chrome installation failed");
  }
}

/**
 * Fetch page HTML inside the sandbox with headless Chrome `--dump-dom`.
 * No CDP / Playwright remote connection is required.
 */
async function dumpDomInSandbox(
  sandbox: Sandbox,
  url: string,
  userAgent: string,
): Promise<string> {
  console.log(`Dumping DOM for ${url} inside sandbox...`);

  // Run Chrome inside the sandbox and read DOM from stdout.
  // Avoid connectOverCDP — the public sandbox WSS endpoint rejects Host headers.
  const dump = await sandbox.runCommand({
    cmd: "google-chrome",
    args: [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--virtual-time-budget=15000",
      `--user-agent=${userAgent}`,
      "--dump-dom",
      url,
    ],
  });

  if (dump.exitCode !== 0) {
    const stderr = await dump.stderr();
    console.error("Chrome dump-dom failed:", stderr);
    throw new Error(`Chrome dump-dom failed with exit code ${dump.exitCode}`);
  }

  const html = await dump.stdout();
  if (!html || html.trim().length < 100) {
    const stderr = await dump.stderr();
    console.error("Chrome dump-dom produced little/no HTML. stderr:", stderr);
    throw new Error(
      `Chrome dump-dom returned empty/short HTML (length=${html?.length ?? 0})`,
    );
  }

  console.log("HTML length:", html.length);
  return html;
}

async function scrapeInVercelSandbox(
  url: string,
  options: {
    timeout?: number;
    userAgent?: string;
  } = {},
): Promise<string> {
  console.log("Using Vercel Sandbox for browser automation...");
  const sandbox = await Sandbox.create({
    // Chrome install + page load needs headroom on cold starts.
    timeout: options.timeout ? Math.max(options.timeout, ms("5m")) : ms("5m"),
  });

  try {
    await installChrome(sandbox);
    return await dumpDomInSandbox(
      sandbox,
      url,
      options.userAgent || DEFAULT_USER_AGENT,
    );
  } finally {
    await sandbox.stop();
  }
}

async function scrapeWithLocalPlaywright(
  url: string,
  options: {
    waitFor?: string;
    timeout?: number;
    userAgent?: string;
  } = {},
): Promise<string> {
  console.log("Development mode: Using local Playwright browser...");
  const chromium = await getChromium();
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      userAgent: options.userAgent || DEFAULT_USER_AGENT,
    });
    const page = await context.newPage();

    console.log(`Navigating to ${url} with local browser...`);
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: options.timeout || 60000,
    });

    if (!response || !response.ok()) {
      throw new Error(
        `Navigation failed! status: ${response?.status()} - ${response?.statusText()}`,
      );
    }

    if (options.waitFor) {
      await page.waitForSelector(options.waitFor, { timeout: 10000 }).catch(() => {
        console.log(
          `Warning: Could not find selector ${options.waitFor}, continuing anyway`,
        );
      });
    }

    const html = await page.content();
    console.log("HTML length:", html.length);
    return html;
  } finally {
    await browser.close();
  }
}

export async function scrapeWithSandbox(
  url: string,
  options: {
    waitFor?: string;
    timeout?: number;
    userAgent?: string;
  } = {},
): Promise<string> {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (isProduction) {
    try {
      return await scrapeInVercelSandbox(url, options);
    } catch (sandboxError) {
      console.error("Sandbox approach failed:", sandboxError);
      throw new Error(
        `Browser automation failed in production environment: ${
          sandboxError instanceof Error ? sandboxError.message : "unknown error"
        }`,
      );
    }
  }

  try {
    return await scrapeWithLocalPlaywright(url, options);
  } catch (localError) {
    console.error("Local Playwright failed:", localError);
    throw new Error(
      "Browser automation failed in development. Make sure Playwright browsers are installed.",
    );
  }
}
