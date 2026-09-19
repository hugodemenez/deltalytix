import { z } from "zod";
import { jsonError } from "@/lib/api/json-error";
import {
  LANDING_FAQ_QUESTION_MAX_LENGTH,
  answerLandingFaqQuestion,
  isLandingFaqLocale,
} from "@/lib/landing-faq-answer";

export const maxDuration = 30;

const landingFaqRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Question is required")
    .max(
      LANDING_FAQ_QUESTION_MAX_LENGTH,
      `Question must be ${LANDING_FAQ_QUESTION_MAX_LENGTH} characters or fewer`,
    ),
  locale: z
    .string()
    .optional()
    .transform((value) => (value === "fr" ? "fr" : "en"))
    .refine(isLandingFaqLocale),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError({
      code: "bad_request",
      message: "Request body must be JSON.",
      hint: "Send { question, locale } as application/json.",
      request,
    });
  }

  const parsed = landingFaqRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError({
      code: "unprocessable_entity",
      message: "Question is missing or too long.",
      hint: `Send a non-empty question of at most ${LANDING_FAQ_QUESTION_MAX_LENGTH} characters, with locale "en" or "fr".`,
      request,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join(".") || "question",
        message: issue.message,
      })),
    });
  }

  try {
    const result = await answerLandingFaqQuestion(parsed.data);

    return Response.json(
      {
        answer: result.answer,
        source: result.source,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return jsonError({
      code: "internal_error",
      message: "Unable to answer this question right now.",
      hint: "Retry the request, or ask support at /support.",
      request,
    });
  }
}

export async function GET(request: Request) {
  return jsonError({
    code: "method_not_allowed",
    message: "GET /api/landing/faq is not supported.",
    hint: "POST { question, locale } to receive an answer from the published FAQ.",
    request,
  });
}
