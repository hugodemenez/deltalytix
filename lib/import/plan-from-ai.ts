import type { ParsePlan, ParsePlanField } from "./parse-plan";
import { PARSE_PLAN_FIELDS } from "./parse-plan";

type AiParsePlan = {
  kind: "closed-trades" | "orders";
  columns: Partial<Record<ParsePlanField, string | null>>;
};

export function planFromAiResponse(
  headers: string[],
  aiPlan: AiParsePlan,
): ParsePlan {
  const columns: ParsePlan["columns"] = {};
  for (const field of PARSE_PLAN_FIELDS) {
    const headerName = aiPlan.columns[field];
    if (!headerName) continue;
    const index = headers.findIndex((header) => header === headerName);
    if (index === -1) continue;
    columns[field] = { header: headerName, index };
  }
  return {
    kind: aiPlan.kind,
    columns,
    quantitySignIsSide: !columns.side,
  };
}
