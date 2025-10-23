import { z } from "zod/v3";

export const ActionSchema = z.enum(["explain", "improve", "suggest_question", "trades_summary"]);
