import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { hasUnsupportedFileUrls } from "@/lib/ai/convert-file-ui-parts";
import { supportAgent } from "@/lib/ai/support-agent";
import {
  hasUserMessage,
  stripInitialAssistantGreeting,
  supportChatRequestSchema,
} from "./schema";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = supportChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: parsed.error.flatten(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const messages = stripInitialAssistantGreeting(parsed.data.messages);

    if (!hasUserMessage(messages)) {
      return new Response(
        JSON.stringify({ error: "No user messages provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (hasUnsupportedFileUrls(messages)) {
      return new Response(
        JSON.stringify({
          error: "Invalid file attachments",
          message:
            "Attachments must be uploaded as images. Please remove and re-attach your files.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return createAgentUIStreamResponse({
      agent: supportAgent,
      uiMessages: messages as UIMessage[],
      sendReasoning: true,
      onStepFinish: (step) => {
        console.log(
          "[Support Agent] Step finished:",
          JSON.stringify(
            {
              finishReason: step.finishReason,
              toolCalls: step.toolCalls?.map((toolCall) => toolCall.toolName),
            },
            null,
            2,
          ),
        );
      },
    });
  } catch (error: unknown) {
    console.error("Support API Error:", error);

    const apiError = error as {
      statusCode?: number;
      type?: string;
    };

    if (apiError?.statusCode === 429 || apiError?.type === "rate_limit_exceeded") {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message:
            "We are experiencing high demand. Please try again in a few minutes or contact support directly.",
          type: "rate_limit_exceeded",
          retryAfter: 300,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "300",
          },
        },
      );
    }

    if (
      apiError?.statusCode &&
      apiError.statusCode >= 400 &&
      apiError.statusCode < 500
    ) {
      return new Response(
        JSON.stringify({
          error: "Service temporarily unavailable",
          message:
            "Our AI service is temporarily unavailable. Please try again later or contact support directly.",
          type: "service_unavailable",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message:
          "An unexpected error occurred. Please try again later or contact support.",
        type: "internal_error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
