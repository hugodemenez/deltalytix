import { z } from "zod";

const uiMessagePartSchema = z
  .object({
    type: z.string(),
  })
  .passthrough();

export const supportChatRequestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          id: z.string().optional(),
          role: z.enum(["user", "assistant", "system"]),
          parts: z.array(uiMessagePartSchema).optional(),
          content: z.string().optional(),
        })
        .passthrough(),
    )
    .min(1, "At least one message is required"),
});

export type SupportChatRequest = z.infer<typeof supportChatRequestSchema>;
