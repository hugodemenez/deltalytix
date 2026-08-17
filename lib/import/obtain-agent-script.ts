import {
  PARSE_SCRIPT_MAX_ATTEMPTS,
  sampleValidationError,
  type ParseScriptChunkResult,
} from "./parse-script";
import { parseFormatTradesApiError } from "@/lib/ai/openai-availability";

export async function obtainAgentParseScript(input: {
  headers: string[];
  rows: string[][];
  peekText?: string;
}): Promise<string> {
  let previousScript: string | undefined;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < PARSE_SCRIPT_MAX_ATTEMPTS; attempt += 1) {
    const generated = await fetch("/api/ai/import-parse-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headers: input.headers,
        rows: input.rows,
        peekText: input.peekText,
        previousScript,
        error: lastError,
      }),
    });
    const raw = await generated.text();
    if (!generated.ok) {
      const code = parseFormatTradesApiError(raw).code;
      throw new Error(code === "AI_UNAVAILABLE" ? "AI_UNAVAILABLE" : "PARSE_SCRIPT_UNABLE");
    }
    const script = (JSON.parse(raw) as { script: string }).script;
    const checked = await fetch("/api/import/parse-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script, rows: input.rows, session: {} }),
    });
    const checkRaw = await checked.text();
    if (!checked.ok) {
      previousScript = script;
      lastError = checkRaw;
      continue;
    }
    const result = JSON.parse(checkRaw) as ParseScriptChunkResult;
    const sampleError = sampleValidationError(result);
    if (!sampleError) return script;
    previousScript = script;
    lastError = sampleError;
  }

  throw new Error("PARSE_SCRIPT_UNABLE");
}
