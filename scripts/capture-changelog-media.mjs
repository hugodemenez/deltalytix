#!/usr/bin/env node
/**
 * Capture localized changelog screenshots and demo videos with Playwright.
 *
 * Usage:
 *   CHANGELOG_BATCH=pr-249 node scripts/capture-changelog-media.mjs
 *   bun run capture:changelog-media -- pr-250
 *
 * Prerequisites:
 *   - Dev server on http://localhost:3000
 *   - Local dashboard auth bypass + seeded data
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright-core'
import { LOCALES, PLAYWRIGHT_LOCALE, SITE_URL } from './changelog-media/constants.mjs'
import { captureScene } from './changelog-media/scenes.mjs'
import { outputDir, outputRoot } from './changelog-media/helpers.mjs'

function resolveBatch() {
  const cliBatch = process.argv.find((arg) => /^pr-\d+$/i.test(arg))
  const batch = process.env.CHANGELOG_BATCH || cliBatch
  if (!batch) {
    throw new Error(
      'Missing changelog batch. Set CHANGELOG_BATCH=pr-123 or pass pr-123 as an argument.',
    )
  }
  return batch
}

async function loadRecipe(batch) {
  const recipePath = path.join(process.cwd(), 'scripts/changelog-media/recipes', `${batch}.mjs`)
  if (!fs.existsSync(recipePath)) {
    throw new Error(
      `No capture recipe found at ${recipePath}. Copy scripts/changelog-media/recipes/template.mjs and customize it.`,
    )
  }

  const recipeModule = await import(`./changelog-media/recipes/${batch}.mjs`)
  const recipe = recipeModule.default

  if (!recipe?.batch || !Array.isArray(recipe.assets) || recipe.assets.length === 0) {
    throw new Error(`Invalid recipe in ${recipePath}`)
  }

  if (recipe.batch !== batch) {
    throw new Error(`Recipe batch "${recipe.batch}" does not match requested batch "${batch}"`)
  }

  return recipe
}

async function main() {
  const batch = resolveBatch()
  const recipe = await loadRecipe(batch)
  const siteUrl = process.env.SITE_URL || SITE_URL

  fs.mkdirSync(outputRoot(batch), { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    for (const locale of LOCALES) {
      console.log(`\n--- Capturing ${locale.toUpperCase()} (${batch}) ---`)
      for (const asset of recipe.assets) {
        console.log(`→ ${asset.scene}: ${asset.file}`)
        await captureScene(browser, {
          batch,
          locale,
          file: asset.file,
          scene: asset.scene,
          siteUrl,
          playwrightLocale: PLAYWRIGHT_LOCALE[locale],
        })
      }
    }

    const files = LOCALES.flatMap((locale) =>
      fs.readdirSync(outputDir(batch, locale)).map((file) => `${locale}/${file}`),
    ).sort()

    console.log(
      JSON.stringify(
        {
          batch,
          outputRoot: outputRoot(batch),
          files,
        },
        null,
        2,
      ),
    )
  } finally {
    await browser.close()
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isDirectRun) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
