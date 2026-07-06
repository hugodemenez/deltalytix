import { z } from "zod";

const MAX_SUPPORT_MESSAGES = 50;
const MAX_MESSAGE_ID_LENGTH = 200;
const MAX_MESSAGE_PARTS = 50;
const MAX_PART_TYPE_LENGTH = 80;
const MAX_TEXT_PART_LENGTH = 8_000;

const uiMessagePartSchema = z
  .object({
    type: z.string().min(1).max(MAX_PART_TYPE_LENGTH),
    text: z.string().max(MAX_TEXT_PART_LENGTH).optional(),
  })
  .passthrough()
  .superRefine((part, ctx) => {
    if (part.type !== "text") return;

    if (typeof part.text !== "string" || part.text.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message: "Text message parts must include non-empty text",
      });
    }
  });

const supportChatMessageSchema = z
  .object({
    id: z.string().min(1).max(MAX_MESSAGE_ID_LENGTH),
    role: z.enum(["user", "assistant"]),
    parts: z
      .array(uiMessagePartSchema)
      .min(1, "Message parts are required")
      .max(MAX_MESSAGE_PARTS, "Too many message parts"),
    metadata: z.unknown().optional(),
  })
  .strict();

export const supportChatRequestSchema = z.object({
  messages: z
    .array(supportChatMessageSchema)
    .min(1, "At least one message is required")
    .max(MAX_SUPPORT_MESSAGES, "Too many messages"),
});

export type SupportChatRequest = z.infer<typeof supportChatRequestSchema>;
export type SupportChatMessage = SupportChatRequest["messages"][number];

export function stripInitialAssistantGreeting(
  messages: SupportChatRequest["messages"],
): SupportChatRequest["messages"] {
  if (messages[0]?.role === "assistant") {
    return messages.slice(1);
  }

  return [...messages];
}

export function hasUserMessage(messages: SupportChatRequest["messages"]): boolean {
  return messages.some((message) => message.role === "user");
}
