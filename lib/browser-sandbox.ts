/**
 * Browser Sandbox Utility for Vercel
 * 
 * This utility uses @vercel/sandbox to create a sandboxed Chrome instance
 * that works reliably in Vercel's serverless environment.
 * 
 * Environment Requirements:
 * - @vercel/sandbox package installed
 * - Deployed on Vercel (sandbox only works in Vercel environment)
 * - No additional authentication required for basic usage
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
import { chromium } from 'playwright-core';
import { z } from 'zod/v3';
import ms from 'ms';

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

const cdpVersionSchema = z.object({
  webSocketDebuggerUrl: z.string(),
});

const BROWSERS_DIR = "browsers";
const PORT = 9222;

async function setupSandbox(sandbox: Sandbox) {
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
    console.error("Failed to download Chrome RPM:", downloadRpm.stderr);
    throw new Error("Chrome RPM download failed");
  }

  console.log("Installing Chrome...")
  const installChrome = await sandbox.runCommand({
    cmd: "dnf",
    args: ["install", "-y", chromeRpmPath],
    sudo: true,
  });

  if (installChrome.exitCode !== 0) {
    console.error("Failed to install Chrome:", installChrome.stderr);
    throw new Error("Chrome installation failed");
  }

  console.log("Starting Chrome...")
  await sandbox.runCommand({
    cmd: "google-chrome",
    args: [
      "--headless",
      "--no-sandbox",
      `--remote-debugging-port=${PORT}`,
      "--remote-debugging-address=0.0.0.0",
    ],
    detached: true,
  });

  console.log("Waiting for Chrome to start...");
  // Health check until the browser is ready
  const fetchVersion = await retryWithBackoff(async () => {
    const result = await sandbox.runCommand({
      cmd: "curl",
      args: [`-s`, `http://localhost:${PORT}/json/version`],
    });

    if (result.exitCode !== 0) {
      throw new Error("Failed to fetch version");
    }

    return result;
  });

  const versionOutput = await fetchVersion.output();
  const data = JSON.parse(versionOutput);
  const { webSocketDebuggerUrl } = cdpVersionSchema.parse(data);

  const url = new URL(webSocketDebuggerUrl);

  const sandboxUrl = new URL(sandbox.domain(PORT));
  const externalUrl = `wss://${sandboxUrl.host}${url.pathname}`;
  console.log("Chrome started successfully. WebSocket URL:", externalUrl);

  return externalUrl;
}

export async function createBrowserSandbox() {
  console.log("Setting up sandbox...");
  const sandbox = await Sandbox.create({
    timeout: ms('5m'), // 5 minutes timeout
    ports: [PORT],
  });

  try {
    const webSocketDebuggerUrl = await setupSandbox(sandbox);

    return { sandbox, webSocketDebuggerUrl };
  } catch (e) {
    await sandbox.stop();
    throw e;
  }
}

export async function scrapeWithSandbox(
  url: string,
  options: {
    waitFor?: string;
    timeout?: number;
    userAgent?: string;
  } = {}
): Promise<string> {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  // Try sandbox approach first (works in Vercel production)
  if (isProduction) {
    try {
      console.log('Using Vercel Sandbox for browser automation...');
      const { sandbox, webSocketDebuggerUrl } = await createBrowserSandbox();
      
      try {
        const browser = await chromium.connectOverCDP(webSocketDebuggerUrl);
        const context = await browser.newContext({
          userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        });
        const page = await context.newPage();

        console.log(`Navigating to ${url} with sandboxed browser...`);
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: options.timeout || 60000
        });

        if (!response || !response.ok()) {
          console.error('Navigation response:', {
            status: response?.status(),
            statusText: response?.statusText(),
            headers: response?.headers()
          });
          throw new Error(`Navigation failed! status: ${response?.status()} - ${response?.statusText()}`);
        }

        // Wait for specific selector if provided
        if (options.waitFor) {
          await page.waitForSelector(options.waitFor, { timeout: 10000 }).catch(() => {
            console.log(`Warning: Could not find selector ${options.waitFor}, continuing anyway`);
          });
        }

        console.log('Page loaded successfully. Getting HTML content...');
        const html = await page.content();
        console.log('HTML length:', html.length);

        await browser.close();
        return html;
      } finally {
        await sandbox.stop();
      }
    } catch (sandboxError) {
      console.error('Sandbox approach failed:', sandboxError);
      throw new Error('Browser automation failed in production environment. Vercel Sandbox may not be properly configured.');
    }
  } else {
    // Fallback for development - use local Playwright
    console.log('Development mode: Using local Playwright browser...');
    try {
      const browser = await chromium.launch({
        headless: true
      });
      
      const context = await browser.newContext({
        userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      console.log(`Navigating to ${url} with local browser...`);
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeout || 60000
      });

      if (!response || !response.ok()) {
        throw new Error(`Navigation failed! status: ${response?.status()} - ${response?.statusText()}`);
      }

      // Wait for specific selector if provided
      if (options.waitFor) {
        await page.waitForSelector(options.waitFor, { timeout: 10000 }).catch(() => {
          console.log(`Warning: Could not find selector ${options.waitFor}, continuing anyway`);
        });
      }

      const html = await page.content();
      console.log('HTML length:', html.length);

      await browser.close();
      return html;
    } catch (localError) {
      console.error('Local Playwright failed:', localError);
      throw new Error('Browser automation failed in development. Make sure Playwright browsers are installed.');
    }
  }
} 