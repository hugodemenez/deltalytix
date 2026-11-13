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
      fr: "Identifiant de profil, adresse e-mail et langue préférée.",
    },
  },
  list_accounts: {
    inputs: {
      en: "Optional includeMetrics (boolean). When true, attaches balance, drawdown, consistency, and progress.",
      fr: "includeMetrics optionnel (booléen). S'il est vrai, ajoute solde, drawdown, cohérence et progression.",
    },
    outputs: {
      en: "Trading accounts: id, number, prop firm, starting balance, createdAt, hidden flag, group (id/name), and payouts (id, amount, date, status). With includeMetrics: balance, drawdown, consistency, progress, and account metrics.",
      fr: "Comptes de trading : id, numéro, prop firm, solde de départ, createdAt, indicateur masqué, groupe (id/nom) et payouts (id, montant, date, statut). Avec includeMetrics : solde, drawdown, cohérence, progression et métriques de compte.",
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
      fr: "Par compte : id, numéro, solde, drawdown, cohérence, progression et métriques détaillées (solde courant, objectifs, niveaux de drawdown, PnL journalier, indicateurs de cohérence, jours de trading).",
    },
  },
  get_equity_curve: {
    inputs: {
      en: "Optional from/to (ISO 8601), accountNumbers (max 50), limit (default 366, max 1000), cursor, and showIndividual (boolean; at most 8 per-account series).",
      fr: "from/to optionnels (ISO 8601), accountNumbers (max 50), limit (défaut 366, max 1000), cursor, et showIndividual (booléen ; au plus 8 séries par compte).",
    },
    outputs: {
      en: "Daily points with date, equity, dailyPnL, dailyCommissions, netPnL; optional per-account series; accountNumbers, dateRange, and nextCursor.",
      fr: "Points journaliers avec date, equity, dailyPnL, dailyCommissions, netPnL ; séries par compte optionnelles ; accountNumbers, dateRange et nextCursor.",
    },
  },
  get_daily_pnl: {
    inputs: {
      en: "Optional from/to (ISO 8601), accountNumbers (max 50), limit (default 366, max 1000), and cursor. Same date/account filters as get_equity_curve (without showIndividual).",
      fr: "from/to optionnels (ISO 8601), accountNumbers (max 50), limit (défaut 366, max 1000) et cursor. Mêmes filtres de date/compte que get_equity_curve (sans showIndividual).",
    },
    outputs: {
      en: "Daily points: date, dailyPnL, netPnL, equity, dailyCommissions; plus accountNumbers, dateRange, and nextCursor.",
      fr: "Points journaliers : date, dailyPnL, netPnL, equity, dailyCommissions ; plus accountNumbers, dateRange et nextCursor.",
    },
  },
  list_connections: {
    inputs: {
      en: "None. Limited to the token's user.",
      fr: "Aucun. Limité à l'utilisateur du jeton.",
    },
    outputs: {
      en: "Broker connections: id, service, externalId, lastSyncedAt, environment, linked accountNumbers, createdAt. Broker passwords, API keys, tokens, and other secrets are never returned.",
      fr: "Connexions courtier : id, service, externalId, lastSyncedAt, environment, accountNumbers liés, createdAt. Les mots de passe, clés API, jetons et autres secrets courtier ne sont jamais renvoyés.",
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
