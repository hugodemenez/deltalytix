import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer";

const BASE = process.env.EVIDENCE_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts";

await mkdir(OUT, { recursive: true });

function cookieNames(cookies) {
  return cookies.map((cookie) => cookie.name).sort();
}

function posthogStorageKeys(client) {
  return client.evaluate(() => {
    const local = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) local.push(key);
    }
    const session = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key) session.push(key);
    }
    const ph = window.posthog;
    return {
      localStorage: local.sort(),
      sessionStorage: session.sort(),
      documentCookies: document.cookie,
      banner: Boolean(document.querySelector("[data-consent-banner], [data-consent-record-drawer], #consent-record-card-title")),
      bannerVisible: document.body.getAttribute("data-consent-banner") === "visible",
      posthog: ph
        ? {
            optedOut: Boolean(ph.has_opted_out_capturing?.()),
            capturing: Boolean(ph.is_capturing?.()),
            persistence: ph.config?.persistence ?? null,
            cookielessMode: ph.config?.cookieless_mode ?? null,
            disableSessionRecording: Boolean(ph.config?.disable_session_recording),
            apiHost: ph.config?.api_host ?? null,
            uiHost: ph.config?.ui_host ?? null,
          }
        : null,
    };
  });
}

async function runScenario(browser, { name, country, path }) {
  const page = await browser.newPage();
  const ingest = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/ingest")) {
      ingest.push({
        method: request.method(),
        url,
        resourceType: request.resourceType(),
      });
    }
  });

  await page.setExtraHTTPHeaders({
    "x-vercel-ip-country": country,
    "x-user-country": country,
  });

  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle0",
    timeout: 60_000,
  });

  // Config + flags load first; $pageview often follows on /e/ or /i/v0/e.
  await page.waitForFunction(
    () => window.posthog && (window.posthog.__loaded || window.posthog.config),
    { timeout: 15_000 },
  ).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const cookies = await page.cookies();
  const storage = await posthogStorageKeys(page);
  const screenshotPath = `${OUT}/posthog-${name}.png`;
  const viewportPath = `${OUT}/posthog-${name}-viewport.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.screenshot({ path: viewportPath });

  const phCookies = cookies.filter((cookie) =>
    /ph_|posthog|__ph/i.test(cookie.name),
  );
  const phLocal = storage.localStorage.filter((key) =>
    /ph_|posthog|__ph/i.test(key),
  );

  await page.close();

  return {
    name,
    country,
    path,
    status: response?.status() ?? null,
    setCookieCountry: cookies.find((cookie) => cookie.name === "user-country")?.value ?? null,
    posthogCookieNames: phCookies.map((cookie) => cookie.name),
    posthogLocalStorage: phLocal,
    allCookieNames: cookieNames(cookies),
    storage,
    ingestRequests: ingest,
    eventRequests: ingest.filter((req) => /\/(e|i|batch|s)\b/.test(req.url)),
    screenshotPath,
    viewportPath,
  };
}

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const eu = await runScenario(browser, {
    name: "eu-fr-pricing",
    country: "FR",
    path: "/pricing",
  });
  const us = await runScenario(browser, {
    name: "us-pricing",
    country: "US",
    path: "/pricing",
  });

  const report = {
    base: BASE,
    generatedAt: new Date().toISOString(),
    eu,
    us,
    checks: {
      euNoPosthogCookies: eu.posthogCookieNames.length === 0,
      euNoPosthogLocalStorage: eu.posthogLocalStorage.length === 0,
      euBannerVisible: eu.storage.bannerVisible || eu.storage.banner,
      euIngestTraffic: eu.ingestRequests.length > 0,
      euCookielessConfig: eu.storage.posthog?.cookielessMode === "on_reject",
      euMemoryPersistence: eu.storage.posthog?.persistence === "memory",
      usBannerHidden: !us.storage.bannerVisible,
      usIngestTraffic: us.ingestRequests.length > 0,
      usIdentifiedCapture: us.storage.posthog?.cookielessMode == null && us.posthogCookieNames.length > 0,
    },
  };

  await writeFile(`${OUT}/posthog-consent-evidence.json`, JSON.stringify(report, null, 2));
  const lines = [
    `# PostHog regional consent evidence`,
    ``,
    `Base: ${BASE}`,
    ``,
    `## EU (FR) /pricing`,
    `- status: ${eu.status}`,
    `- user-country cookie: ${eu.setCookieCountry}`,
    `- PostHog cookies: ${eu.posthogCookieNames.join(", ") || "(none)"}`,
    `- PostHog localStorage: ${eu.posthogLocalStorage.join(", ") || "(none)"}`,
    `- banner visible: ${report.checks.euBannerVisible}`,
    `- posthog: ${JSON.stringify(eu.storage.posthog)}`,
    `- /ingest requests: ${eu.ingestRequests.length}`,
    ...eu.ingestRequests.slice(0, 12).map((req) => `  - ${req.method} ${req.url}`),
    ``,
    `## US /pricing`,
    `- status: ${us.status}`,
    `- user-country cookie: ${us.setCookieCountry}`,
    `- banner visible: ${us.storage.bannerVisible}`,
    `- posthog: ${JSON.stringify(us.storage.posthog)}`,
    `- /ingest requests: ${us.ingestRequests.length}`,
    ...us.ingestRequests.slice(0, 12).map((req) => `  - ${req.method} ${req.url}`),
    ``,
    `## Checks`,
    ...Object.entries(report.checks).map(([key, value]) => `- ${key}: ${value}`),
  ];
  await writeFile(`${OUT}/posthog-consent-evidence.md`, lines.join("\n"));
  console.log(JSON.stringify(report.checks, null, 2));
  console.log(`EU ingest: ${eu.ingestRequests.length} US ingest: ${us.ingestRequests.length}`);
} finally {
  await browser.close();
}
