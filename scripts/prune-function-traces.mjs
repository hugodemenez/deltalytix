#!/usr/bin/env node
/**
 * Turbopack's NFT traces do not reliably apply `outputFileTracingExcludes`.
 * `outputFileTracingIncludes` for `/api/ai/support` copies the product source
 * corpus, and NFT then follows imports in those `.ts` files — pulling TypeScript,
 * Playwright, pdf-lib, `docx`, extra sharp platforms, etc. into every matching
 * function. That is what pushed `api/ai/support/translate-label` over Vercel's
 * 250MB uncompressed limit.
 *
 * Vercel copies NFT files inside `next build`, before this script runs, so
 * this pass cannot shrink the deployed function. Keep heavy files out of the
 * trace Turbopack emits (see the support corpus snapshot).
 *
 * This pass rewrites `.next/server/` NFT traces after `next build`:
 * - drop toolchain / browser / unused native packages from every function
 * - keep `docx` / `sharp` only on the Word export route
 * - drop the support corpus from nested `/api/ai/support/*` routes
 *
 * Usage: node scripts/prune-function-traces.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(repoRoot, ".next", "server");

/** Packages that no production serverless function should ship. */
export const GLOBAL_DENY_PACKAGES = new Set([
  "typescript",
  "ts-node",
  "tsx",
  "prettier",
  "eslint",
  "vitest",
  "playwright",
  "playwright-core",
  "puppeteer",
  "puppeteer-core",
  "chromium-bidi",
  "canvas",
  "axe-core",
  "fast-check",
  "shadcn",
  "pdf-lib",
]);

const GLOBAL_DENY_PACKAGE_PREFIXES = [
  "@babel/",
  "@types/",
  "@typescript-eslint/",
  "@vitest/",
  "@eslint/",
  "@jest/",
  "eslint-",
  "eslint-plugin-",
  "eslint-config-",
  "@pdf-lib/",
];

const GLOBAL_DENY_PATH_SNIPPETS = [
  "/next/dist/docs/",
  "/@img/sharp-libvips-linuxmusl-",
  "/@img/sharp-linuxmusl-",
  "/@img/sharp-libvips-darwin-",
  "/@img/sharp-darwin-",
  "/@img/sharp-win32-",
  "/@img/sharp-libvips-linux-arm",
  "/@img/sharp-linux-arm",
];

const TEST_FILE_PATTERN = /\.(test|spec)\.(c|m)?(t|j)sx?$/i;

function normalize(filePath) {
  return filePath.replaceAll("\\", "/");
}

export function nodeModulePackage(filePath) {
  const match = normalize(filePath).match(
    /\/node_modules\/((?:@[^/]+\/[^/]+)|[^/]+)/,
  );
  return match ? match[1] : null;
}

export function isRepoSourceFile(filePath) {
  const n = normalize(filePath);
  if (n.includes("/.next/") || n.includes("/node_modules/")) return false;
  if (n.startsWith("./") && !n.includes("..")) return false;
  return /(^|\/)(app|lib|components|locales|content|server|hooks|store|context|prisma|agents|videos|supabase)\//.test(
    n,
  ) || /(?:^|\/)(AGENTS|README|SECURITY|SELF_HOSTING)\.md$/.test(n);
}

function isDeniedPackage(pkg) {
  if (!pkg) return false;
  if (GLOBAL_DENY_PACKAGES.has(pkg)) return true;
  return GLOBAL_DENY_PACKAGE_PREFIXES.some((prefix) => pkg.startsWith(prefix));
}

function isDocxRoute(route) {
  return route.includes("app/api/journal-docx/");
}

function isNestedSupportRoute(route) {
  return /app\/api\/ai\/support\/.+\/route$/.test(route);
}

export function shouldDropTracedFile(filePath, route) {
  const n = normalize(filePath);
  const pkg = nodeModulePackage(n);

  if (TEST_FILE_PATTERN.test(n) && !n.includes("/node_modules/")) {
    return true;
  }
  if (GLOBAL_DENY_PATH_SNIPPETS.some((snippet) => n.includes(snippet))) {
    return true;
  }
  if (isDeniedPackage(pkg)) {
    return true;
  }
  if (pkg === "docx" && !isDocxRoute(route)) {
    return true;
  }
  if (isNestedSupportRoute(route) && isRepoSourceFile(n)) {
    return true;
  }
  return false;
}

async function collectNftFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectNftFiles(full)));
    } else if (entry.name.endsWith(".nft.json")) {
      files.push(full);
    }
  }
  return files;
}

function routeFromNft(nftPath) {
  return path
    .relative(serverDir, nftPath)
    .replace(/\\/g, "/")
    .replace(/\.js\.nft\.json$/, "")
    .replace(/\.nft\.json$/, "");
}

async function pruneOne(nftPath) {
  const route = routeFromNft(nftPath);
  const data = JSON.parse(await readFile(nftPath, "utf8"));
  const files = Array.isArray(data.files) ? data.files : [];
  const hashes = Array.isArray(data.fileHashes) ? data.fileHashes : null;
  const keptFiles = [];
  const keptHashes = hashes ? [] : null;
  let dropped = 0;
  for (let i = 0; i < files.length; i += 1) {
    if (shouldDropTracedFile(files[i], route)) {
      dropped += 1;
      continue;
    }
    keptFiles.push(files[i]);
    if (keptHashes && hashes) keptHashes.push(hashes[i]);
  }
  if (dropped === 0) {
    return { route, dropped: 0, before: files.length, after: files.length };
  }
  const next = {
    ...data,
    files: keptFiles,
  };
  if (keptHashes) next.fileHashes = keptHashes;
  await writeFile(nftPath, JSON.stringify(next));
  return { route, dropped, before: files.length, after: keptFiles.length };
}

async function main() {
  let nftFiles;
  try {
    nftFiles = await collectNftFiles(serverDir);
  } catch {
    console.error("No .next/server traces found. Run `next build` first.");
    process.exit(1);
  }

  const results = [];
  for (const nftPath of nftFiles) {
    results.push(await pruneOne(nftPath));
  }
  const changed = results.filter((row) => row.dropped > 0);
  changed.sort((a, b) => b.dropped - a.dropped);

  console.log(
    `Pruned ${changed.length} / ${results.length} NFT traces (dropped toolchain, browsers, unused natives, leaked docx, nested-support corpus).`,
  );
  for (const row of changed.slice(0, 20)) {
    console.log(
      `  -${String(row.dropped).padStart(5)} files  ${row.before} → ${row.after}  ${row.route}`,
    );
  }
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
