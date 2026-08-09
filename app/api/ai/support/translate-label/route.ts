import { NextResponse } from "next/server";
import { z } from "zod";
import { supportAgentLocaleSchema } from "@/app/api/ai/support/schema";
import { translateReasoningLabel } from "@/lib/ai/translate-reasoning-label";

export const maxDuration = 15;

const requestSchema = z.object({
  text: z.string().trim().min(1).max(200),
  locale: supportAgentLocaleSchema,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { text, locale } = parsed.data;

    if (locale === "en") {
      return NextResponse.json({ label: text });
    }

    const label = await translateReasoningLabel({ text, locale });
    return NextResponse.json({ label });
  } catch (error) {
    console.error("[Support] translate-label error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 },
    );
  }
}
