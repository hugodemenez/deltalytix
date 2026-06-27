import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { supportAgent } from "@/lib/ai/support-agent";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (messages[0]?.role === "assistant") {
      messages.shift();
    }

    return createAgentUIStreamResponse({
      agent: supportAgent,
      uiMessages: messages,
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
