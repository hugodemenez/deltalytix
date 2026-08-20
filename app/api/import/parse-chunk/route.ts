import { NextRequest } from "next/server";
import { z } from "zod/v3";
import { extractParseScript } from "@/lib/import/parse-script";
import { runParseScriptChunk } from "@/lib/import/run-parse-script";

export const maxDuration = 60;

const requestSchema = z.object({
  script: z.string().min(20).max(40_000),
  rows: z.array(z.array(z.string())).max(10_000),
  session: z.record(z.unknown()).optional(),
  sandboxName: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = requestSchema.parse(await req.json());
    const script = extractParseScript(body.script);
    const result = await runParseScriptChunk(
      script,
      body.rows,
      body.session ?? {},
      { sandboxName: body.sandboxName },
    );
    return Response.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("import parse-chunk failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "PARSE_SCRIPT_FAILED",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
