#!/usr/bin/env node
/**
 * Sum Next.js `.nft.json` traces after `next build`.
 *
 * Local trace bytes are not Vercel's uncompressed lambda size (Vercel also
 * adds the Next.js server runtime layer), but they show which routes picked
 * up `docx`, extra sharp platforms, or the support corpus source tree.
 *
 * Usage: node scripts/analyze-function-traces.mjs
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(repoRoot, ".next", "server");
const MB = 1024 * 1024;
const TRANSLATE_LABEL = "app/api/ai/support/translate-label/route";
const JOURNAL_DOCX = "app/api/journal-docx/route";
const SUPPORT_CHAT = "app/api/ai/support/route";
const SUPPORT_CORPUS_SNAPSHOT = "lib/ai/support-corpus.generated.json";

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

function classify(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  const isBundled = normalized.includes("/.next/") || normalized.includes("/node_modules/");
  return {
    docx: /(^|\/)node_modules\/docx\//.test(normalized),
    sharpMusl: /sharp-libvips-linuxmusl|sharp-linuxmusl/.test(normalized),
    canvas: /(^|\/)node_modules\/canvas\//.test(normalized),
    playwright: /(^|\/)node_modules\/playwright/.test(normalized),
    corpusSource:
      !isBundled && /(^|\/)(app|lib|components|locales|content)\//.test(normalized),
  };
}

async function traceSize(nftPath) {
  const json = JSON.parse(await readFile(nftPath, "utf8"));
  const files = Array.isArray(json.files) ? json.files : [];
  const nftDir = path.dirname(nftPath);
  let bytes = 0;
  const flags = {
    docx: false,
    sharpMusl: false,
    canvas: false,
    playwright: false,
    corpusSourceCount: 0,
  };
  for (const relative of files) {
    const resolved = path.resolve(nftDir, relative);
    try {
      bytes += (await stat(resolved)).size;
    } catch {
      // Missing optional files are skipped; Vercel would skip them too.
    }
    const hit = classify(relative);
    if (hit.docx) flags.docx = true;
    if (hit.sharpMusl) flags.sharpMusl = true;
    if (hit.canvas) flags.canvas = true;
    if (hit.playwright) flags.playwright = true;
    if (hit.corpusSource) flags.corpusSourceCount += 1;
  }
  const rel = path.relative(serverDir, nftPath).replace(/\\/g, "/");
  const route = rel.replace(/\.js\.nft\.json$/, "").replace(/\.nft\.json$/, "");
  return { route, bytes, fileCount: files.length, ...flags };
}

async function main() {
  let nftFiles;
  try {
    nftFiles = await collectNftFiles(serverDir);
  } catch {
    console.error("No .next/server traces found. Run `bun run build` first.");
    process.exit(1);
  }

  const traces = [];
  for (const nftPath of nftFiles) {
    traces.push(await traceSize(nftPath));
  }
  traces.sort((a, b) => b.bytes - a.bytes);

  const format = (row) =>
    `${(row.bytes / MB).toFixed(2).padStart(7)} MB  ${String(row.fileCount).padStart(5)} files  ${row.route}`;

  console.log(`Traced ${traces.length} serverless entries under .next/server\n`);
  console.log("Largest traces:");
  for (const row of traces.slice(0, 15)) {
    console.log(format(row));
  }

  const pick = (fragment) =>
    traces.find((row) => row.route === fragment || row.route.endsWith(fragment));

  console.log("\nWatched routes:");
  for (const fragment of [TRANSLATE_LABEL, SUPPORT_CHAT, JOURNAL_DOCX]) {
    const row = pick(fragment);
    if (!row) {
      console.log(`  missing  ${fragment}`);
      continue;
    }
    const extras = [
      row.docx && "docx",
      row.sharpMusl && "sharp-musl",
      row.canvas && "canvas",
      row.playwright && "playwright",
      row.corpusSourceCount > 0 && `corpus-source:${row.corpusSourceCount}`,
    ].filter(Boolean);
    console.log(
      `  ${format(row)}${extras.length ? `  [${extras.join(", ")}]` : ""}`,
    );
  }

  const translate = pick(TRANSLATE_LABEL);
  const journal = pick(JOURNAL_DOCX);
  const failures = [];
  // The chat route copies the whole corpus (thousands of files). Nested
  // title-translation must not inherit that include; a handful of own-source
  // files in the trace is normal.
  if ((translate?.corpusSourceCount ?? 0) > 50) {
    failures.push(
      `translate-label still traces ${translate.corpusSourceCount} app/lib/components source files (support corpus leak)`,
    );
  }
  if (translate?.docx) {
    failures.push("translate-label still traces node_modules/docx");
  }
  if (translate?.sharpMusl || journal?.sharpMusl) {
    failures.push("a watched route still traces sharp linuxmusl binaries");
  }
  // Vercel packages the NFT emitted by `next build`. These routes should stay
  // near the other api/ai functions (single-digit or low tens of MB). 80MB
  // still leaves headroom under the 250MB cap if the snapshot leaks onto the
  // title translator, and fails the old ~249MB corpus-import trace.
  const supportRouteCeiling = 80 * 1024 * 1024;
  if ((translate?.bytes ?? 0) > supportRouteCeiling) {
    failures.push(
      `translate-label trace is still ${(translate.bytes / 1024 / 1024).toFixed(2)} MB (ceiling 80 MB; Vercel fails at 250 MB uncompressed)`,
    );
  }
  if ((pick(SUPPORT_CHAT)?.bytes ?? 0) > supportRouteCeiling) {
    const support = pick(SUPPORT_CHAT);
    failures.push(
      `support chat trace is still ${(support.bytes / 1024 / 1024).toFixed(2)} MB (ceiling 80 MB; Vercel fails at 250 MB uncompressed)`,
    );
  }
  for (const fragment of [TRANSLATE_LABEL, SUPPORT_CHAT]) {
    const row = pick(fragment);
    if (!row) continue;
    const nftPath = path.join(serverDir, `${fragment}.js.nft.json`);
    const traced = JSON.parse(await readFile(nftPath, "utf8"));
    const joined = (traced.files || []).join("\n");
    if (joined.includes("/next/dist/compiled/next-server/app-page.runtime.dev.js")) {
      failures.push(
        `${fragment} still traces next-server dev runtimes (support corpus source leak)`,
      );
    }
    if (
      fragment === SUPPORT_CHAT &&
      !joined.replaceAll("\\", "/").includes(SUPPORT_CORPUS_SNAPSHOT)
    ) {
      failures.push(
        `${fragment} trace is missing ${SUPPORT_CORPUS_SNAPSHOT} (production support search would be empty)`,
      );
    }
  }
  if (!journal) {
    failures.push("journal-docx route trace is missing");
  }
  if (!pick(SUPPORT_CHAT)) {
    failures.push(
      `support chat route trace is missing (${SUPPORT_CORPUS_SNAPSHOT} cannot be verified)`,
    );
  }

  if (failures.length > 0) {
    console.error("\nTrace checks failed:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log("\nTrace checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
