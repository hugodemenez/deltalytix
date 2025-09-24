import { z } from 'zod/v3';

export const chatResponseSchema = z.object({
  type: z.enum(["text", "done", "error"]),
  content: z.string().optional(),
  message: z.string().optional(),
});