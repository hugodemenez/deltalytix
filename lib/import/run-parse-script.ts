import { Sandbox } from "@vercel/sandbox";
import vm from "node:vm";
import {
  validateParseScriptResult,
  type ParseScriptChunkResult,
  type ParseScriptSession,
} from "./parse-script";

const SANDBOX_RUNNER = `import { readFileSync } from "node:fs";
import { parseChunk } from "./parse.mjs";
const input = JSON.parse(readFileSync("input.json", "utf8"));
const result = parseChunk(input.rows ?? [], input.session ?? {});
process.stdout.write(JSON.stringify(result));
`;

function wrapAsModule(script: string): string {
  if (script.includes("export function parseChunk")) return script;
  return `${script}\nexport { parseChunk };\n`;
}

function sandboxCredentials() {
  if (
    process.env.VERCEL_TOKEN &&
    process.env.VERCEL_TEAM_ID &&
    process.env.VERCEL_PROJECT_ID
  ) {
    return {
      token: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID,
      projectId: process.env.VERCEL_PROJECT_ID,
    };
  }
  return {};
}

export function canUseVercelSandbox(): boolean {
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN ||
      (process.env.VERCEL_TOKEN &&
        process.env.VERCEL_TEAM_ID &&
        process.env.VERCEL_PROJECT_ID),
  );
}

/**
 * Run untrusted agent JS. Prefers a Vercel Sandbox (Firecracker).
 * Falls back to a sealed Node vm for local/dev when Sandbox creds are missing.
 */
export async function runParseScriptChunk(
  script: string,
  rows: string[][],
  session: ParseScriptSession,
  options?: { sandboxName?: string },
): Promise<ParseScriptChunkResult & { sandboxName?: string }> {
  if (canUseVercelSandbox()) {
    return runInSandbox(script, rows, session, options?.sandboxName);
  }
  return {
    ...runInVm(script, rows, session),
  };
}

export function runInVm(
  script: string,
  rows: string[][],
  session: ParseScriptSession,
): ParseScriptChunkResult {
  const wrapped = `"use strict";\n${script}\n;if (typeof parseChunk !== "function") { throw new Error("parseChunk is not defined"); }\nparseChunk;`;
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
  });
  const parseChunk = vm.runInContext(wrapped, context, {
    timeout: 5_000,
    displayErrors: true,
  }) as (chunkRows: string[][], chunkSession: ParseScriptSession) => unknown;
  return validateParseScriptResult(parseChunk(rows, session));
}

async function runInSandbox(
  script: string,
  rows: string[][],
  session: ParseScriptSession,
  sandboxName?: string,
): Promise<ParseScriptChunkResult & { sandboxName: string }> {
  const name = sandboxName ?? `import-parse-${crypto.randomUUID()}`;
  const sandbox = sandboxName
    ? await Sandbox.get({ ...sandboxCredentials(), name })
    : await Sandbox.create({
        ...sandboxCredentials(),
        name,
        runtime: "node24",
        timeout: 15 * 60 * 1000,
        networkPolicy: "deny-all",
      });

  await sandbox.writeFiles([
    ...(!sandboxName
      ? [
          { path: "parse.mjs", content: Buffer.from(wrapAsModule(script)) },
          { path: "run.mjs", content: Buffer.from(SANDBOX_RUNNER) },
        ]
      : []),
    {
      path: "input.json",
      content: Buffer.from(JSON.stringify({ rows, session })),
    },
  ]);

  const result = await sandbox.runCommand({
    cmd: "node",
    args: ["run.mjs"],
  });
  if (result.exitCode !== 0) {
    const stderr = await result.stderr();
    throw new Error(stderr || "PARSE_SCRIPT_SANDBOX_FAILED");
  }
  const stdout = await result.stdout();
  return {
    ...validateParseScriptResult(JSON.parse(stdout)),
    sandboxName: name,
  };
}
