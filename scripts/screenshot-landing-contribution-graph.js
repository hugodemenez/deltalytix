import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PR = process.env.PR_NUMBER || "269";
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

const OUTPUTS = [
  {
    locale: "en",
    viewport: { width: 1280, height: 900, deviceScaleFactor: 2 },
    suffix: "desktop",
  },
  {
    locale: "en",
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
    suffix: "mobile",
  },
  {
    locale: "fr",
    viewport: { width: 1280, height: 900, deviceScaleFactor: 2 },
    suffix: "desktop",
  },
  {
    locale: "fr",
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
    suffix: "mobile",
  },
];

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  for (const output of OUTPUTS) {
    const outDir = path.join(
      __dirname,
      "..",
      "public",
      "updates",
      `pr-${PR}`,
      output.locale
    );
    fs.mkdirSync(outDir, { recursive: true });

    await page.setViewport({
      ...output.viewport,
      isMobile: output.viewport.isMobile ?? false,
      hasTouch: output.viewport.isMobile ?? false,
    });

    const url = `${SITE_URL}/${output.locale}#open-source`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });

    await page.waitForSelector("#open-source", { timeout: 60000 });

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const accept = buttons.find((button) =>
        /accept all|tout accepter/i.test(button.textContent ?? "")
      );
      accept?.click();
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    await page.evaluate(() => {
      const section = document.getElementById("open-source");
      section?.scrollIntoView({ block: "center" });
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const card = await page.$("#open-source .bg-card:last-of-type");
    const target = card || (await page.$("#open-source"));

    const filename = `landing-contribution-graph-${output.suffix}.png`;
    const outPath = path.join(outDir, filename);

    if (target) {
      await target.screenshot({ path: outPath, type: "png" });
    } else {
      await page.screenshot({ path: outPath, type: "png", fullPage: false });
    }

    console.log("Saved", outPath);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
