import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { createElement } from "react";

import FeedbackAcknowledgementEmail from "@/components/emails/feedback-acknowledgement";

// TEMPORARY — delete before this branch merges anywhere.
// Answers one question: can @react-email/render be imported and executed from a
// Route Handler on beta's Turbopack build? Server actions cannot (the renderer
// is externalised to an unresolvable hashed module id). Sends nothing.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const html = await render(
      createElement(FeedbackAcknowledgementEmail, {
        firstName: "Test",
        language: "en" as const,
        feedbackType: "other" as const,
        message: "render check",
      }),
    );
    return NextResponse.json({ ok: true, htmlLength: html.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
