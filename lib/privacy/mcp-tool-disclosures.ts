import { MCP_TOOLS, type McpToolName } from "@/lib/mcp/catalog"

/**
 * Field-level privacy disclosures for every tool in `MCP_TOOLS`.
 * Adding a tool to the catalog without a row here fails typecheck.
 */
type Localized = { en: string; fr: string }

type ToolDisclosure = {
  inputs: Localized
  outputs: Localized
}

const BY_NAME = {
  get_profile: {
    inputs: {
      en: "None. The user is taken from the bearer token; the tool does not accept a user id.",
      fr: "Aucun. L'utilisateur est tiré du jeton bearer ; l'outil n'accepte pas d'identifiant utilisateur.",
    },
    outputs: {
      en: "Profile id, email address, and language preference.",
      fr: "Profil : id, email et language (langue préférée).",
    },
  },
  list_accounts: {
    inputs: {
      en: "Optional includeMetrics (boolean). When true, attaches balance, drawdown, consistency, and progress.",
      fr: "includeMetrics optionnel (booléen). S'il est vrai, ajoute solde, drawdown, cohérence et progression.",
    },
    outputs: {
      en: "Trading accounts: id, number, prop firm label (propfirm), startingBalance, createdAt, hidden, group (id/name), and payouts (id, amount, date, status). With includeMetrics: balance, drawdown, consistency, progress, and account metrics.",
      fr: "Comptes de trading : id, number, libellé de prop firm (propfirm), startingBalance, createdAt, hidden, group (id/name) et payouts (id, amount, date, status). Avec includeMetrics : balance, drawdown, consistency, progress et metrics.",
    },
  },
  list_trades: {
    inputs: {
      en: "Optional filters: accountNumber, instrument, side (long/short), from/to (inclusive ISO 8601 entryDate bounds). Pagination: limit (default 100, max 500) and cursor.",
      fr: "Filtres optionnels : accountNumber, instrument, side (long/short), from/to (bornes ISO 8601 inclusives sur entryDate). Pagination : limit (défaut 100, max 500) et cursor.",
    },
    outputs: {
      en: "Trades newest-first: id, accountNumber, instrument, side, quantity, entryPrice, closePrice, entryDate, closeDate, pnl, commission, timeInPosition, tags, comment, createdAt; plus nextCursor when more pages exist. Screenshots and broker secrets are not returned.",
      fr: "Trades du plus récent au plus ancien : id, accountNumber, instrument, side, quantity, entryPrice, closePrice, entryDate, closeDate, pnl, commission, timeInPosition, tags, comment, createdAt ; plus nextCursor s'il reste des pages. Les captures d'écran et secrets courtier ne sont pas renvoyés.",
    },
  },
  get_metrics_summary: {
    inputs: {
      en: "Same optional trade filters as list_trades: accountNumber, instrument, side, from, to. No pagination.",
      fr: "Mêmes filtres optionnels que list_trades : accountNumber, instrument, side, from, to. Pas de pagination.",
    },
    outputs: {
      en: "Aggregates: totalPnl, totalCommission, tradeCount, winCount, lossCount, breakevenCount, winRate, profitFactor, averageWin, averageLoss, longCount, shortCount, tradingDays.",
      fr: "Agrégats : totalPnl, totalCommission, tradeCount, winCount, lossCount, breakevenCount, winRate, profitFactor, averageWin, averageLoss, longCount, shortCount, tradingDays.",
    },
  },
  get_account_metrics: {
    inputs: {
      en: "None. Limited to the token's user.",
      fr: "Aucun. Limité à l'utilisateur du jeton.",
    },
    outputs: {
      en: "Per-account id, number, balance, drawdown, consistency, progress, and detailed metrics (current balance, targets, drawdown levels, daily PnL, consistency flags, trading-day counts).",
      fr: "Par compte : id, number, balance, drawdown, consistency, progress et metrics détaillées (solde courant, objectifs, niveaux de drawdown, PnL journalier, indicateurs de cohérence, jours de trading).",
    },
  },
  get_equity_curve: {
    inputs: {
      en: "Optional from/to (ISO 8601), accountNumbers (max 50), limit (default 366, max 1000), cursor, and showIndividual (boolean; at most 8 per-account series).",
      fr: "from/to optionnels (ISO 8601), accountNumbers (max 50), limit (défaut 366, max 1000), cursor, et showIndividual (booléen ; au plus 8 séries par compte).",
    },
    outputs: {
      en: "Daily points with date, equity, dailyPnL, dailyCommissions, netPnL; dateRange {startDate, endDate}; accountNumbers; nextCursor. On payout or reset days, dynamic keys reset_<account>, payout_<account>, payoutStatus_<account>, and payoutAmount_<account>. With showIndividual, equity_<account> series and combined equity is 0.",
      fr: "Points journaliers avec date, equity, dailyPnL, dailyCommissions, netPnL ; dateRange {startDate, endDate} ; accountNumbers ; nextCursor. Les jours de payout ou de reset : clés dynamiques reset_<compte>, payout_<compte>, payoutStatus_<compte> et payoutAmount_<compte>. Avec showIndividual, séries equity_<compte> et l'equity combinée vaut 0.",
    },
  },
  get_daily_pnl: {
    inputs: {
      en: "Optional from/to (ISO 8601), accountNumbers (max 50), limit (default 366, max 1000), and cursor. Same date/account filters as get_equity_curve (without showIndividual).",
      fr: "from/to optionnels (ISO 8601), accountNumbers (max 50), limit (défaut 366, max 1000) et cursor. Mêmes filtres de date/compte que get_equity_curve (sans showIndividual).",
    },
    outputs: {
      en: "Daily points projected from the equity series: date, dailyPnL, netPnL, equity, dailyCommissions; plus accountNumbers, dateRange {startDate, endDate}, and nextCursor.",
      fr: "Points journaliers projetés depuis la série d'equity : date, dailyPnL, netPnL, equity, dailyCommissions ; plus accountNumbers, dateRange {startDate, endDate} et nextCursor.",
    },
  },
  list_connections: {
    inputs: {
      en: "None. Limited to the token's user.",
      fr: "Aucun. Limité à l'utilisateur du jeton.",
    },
    outputs: {
      en: "Broker connections: id, service, externalId (broker-side account or user identifier), lastSyncedAt, environment, linked accountNumbers, createdAt. Broker passwords, API keys, tokens, and other secrets are never returned.",
      fr: "Connexions courtier : id, service, externalId (identifiant de compte ou d'utilisateur côté courtier), lastSyncedAt, environment, accountNumbers liés, createdAt. Les mots de passe, clés API, jetons et autres secrets courtier ne sont jamais renvoyés.",
    },
  },
} as const satisfies Record<McpToolName, ToolDisclosure>

export type McpToolPrivacyRow = {
  name: McpToolName
  scope: (typeof MCP_TOOLS)[number]["scope"]
  inputs: Localized
  outputs: Localized
}

/** One row per registered MCP tool, in catalog order. */
export const MCP_TOOL_PRIVACY_ROWS: readonly McpToolPrivacyRow[] = MCP_TOOLS.map(
  (tool) => ({
    name: tool.name,
    scope: tool.scope,
    inputs: BY_NAME[tool.name].inputs,
    outputs: BY_NAME[tool.name].outputs,
  }),
)

export function mcpToolPrivacyNames(): McpToolName[] {
  return MCP_TOOL_PRIVACY_ROWS.map((row) => row.name)
}

/** Static output field names that every fixture for a tool must disclose. */
export const MCP_TOOL_OUTPUT_FIELD_HINTS: Record<McpToolName, readonly string[]> = {
  get_profile: ["id", "email", "language"],
  list_accounts: ["id", "number", "propfirm", "startingBalance", "createdAt", "hidden", "group", "payouts"],
  list_trades: [
    "id",
    "accountNumber",
    "instrument",
    "side",
    "quantity",
    "entryPrice",
    "closePrice",
    "entryDate",
    "closeDate",
    "pnl",
    "commission",
    "timeInPosition",
    "tags",
    "comment",
    "createdAt",
  ],
  get_metrics_summary: [
    "totalPnl",
    "totalCommission",
    "tradeCount",
    "winCount",
    "lossCount",
    "breakevenCount",
    "winRate",
    "profitFactor",
    "averageWin",
    "averageLoss",
    "longCount",
    "shortCount",
    "tradingDays",
  ],
  get_account_metrics: ["id", "number", "balance", "drawdown", "consistency", "progress", "metrics"],
  get_equity_curve: [
    "date",
    "equity",
    "dailyPnL",
    "dailyCommissions",
    "netPnL",
    "dateRange",
    "accountNumbers",
    "nextCursor",
    "reset_",
    "payout_",
    "payoutStatus_",
    "payoutAmount_",
    "equity_",
  ],
  get_daily_pnl: ["date", "dailyPnL", "netPnL", "equity", "dailyCommissions", "accountNumbers", "dateRange", "nextCursor"],
  list_connections: [
    "id",
    "service",
    "externalId",
    "lastSyncedAt",
    "environment",
    "accountNumbers",
    "createdAt",
  ],
}
