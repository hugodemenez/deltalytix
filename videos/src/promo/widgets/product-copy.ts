/**
 * Copy and pinned demo numbers taken from the product, not invented.
 *
 * Chat: locales/en/landing.ts `landing.features.chat-feature`
 * Connections chrome: locales/en.ts `connections.*`
 * Prop firm cards: locales/en/propfirm.ts + account sizes in
 *   app/[locale]/dashboard/components/accounts/config.ts
 */

export const chatCopy = {
  widgetTitle: "Chat",
  contextAnalyzed: "127 trades and 18 journal entries connected",
  analyzing: "Looking for patterns in your journal…",
  inputPlaceholder: "Ask your AI coach anything…",
  question:
    "What psychological patterns do you see in my losing trades? Are there specific market conditions where I consistently struggle?",
  response:
    "Your journal entries reveal a clear pattern: after 2+ consecutive losses, you increase position size by 40% and abandon your setup criteria. This revenge trading accounts for 73% of your largest losses.",
} as const;

export const chatFeatureCaption = {
  eyebrow: "AI-Powered Journaling",
  title: "Ask the coach what the journal already knows.",
} as const;

export const connectionsCopy = {
  title: "Connections",
  description:
    "Manage broker connections and the trading accounts they host. Import files for standalone accounts.",
  addConnection: "Add connection",
  uploadFile: "Upload a file",
  syncAll: "Sync all",
  connected: "Connected",
  lastSynced: "Last synced 27 Aug 2026",
  lastTrade: "Last trade 27/08/2026",
  fileImport: "File import",
} as const;

export const connectionsFeatureCaption = {
  eyebrow: "Data import",
  title: "Every broker and funded account, in one place.",
} as const;

export type PromoConnection = {
  readonly service: string;
  readonly slug: string;
  readonly ext: "png" | "svg";
  readonly label: string;
  readonly displayName: string;
  readonly loginLabel: string;
  readonly accountCount: string;
  readonly accountNumber: string;
  readonly tradeCount: string;
};

/** Direct-sync services from connections-page-chrome SERVICE_SECTIONS. */
export const promoConnections: PromoConnection[] = [
  {
    service: "rithmic-protocol",
    slug: "rithmic",
    ext: "png",
    label: "Rithmic Protocol",
    displayName: "Rithmic Protocol",
    loginLabel: "APEX-50K",
    accountCount: "1 account",
    accountNumber: "APX1842",
    tradeCount: "18 trades",
  },
  {
    service: "tradovate",
    slug: "tradovate",
    ext: "png",
    label: "Tradovate",
    displayName: "Tradovate",
    loginLabel: "Live",
    accountCount: "2 accounts",
    accountNumber: "12345678",
    tradeCount: "24 trades",
  },
  {
    service: "dxfeed",
    slug: "dxfeed",
    ext: "png",
    label: "DxFeed",
    displayName: "DxFeed",
    loginLabel: "Demo",
    accountCount: "1 account",
    accountNumber: "DX-44102",
    tradeCount: "9 trades",
  },
  {
    service: "ibkr",
    slug: "ibkr",
    ext: "png",
    label: "Interactive Brokers",
    displayName: "Interactive Brokers",
    loginLabel: "U7123456",
    accountCount: "1 account",
    accountNumber: "U7123456",
    tradeCount: "31 trades",
  },
  {
    service: "ig",
    slug: "ig",
    ext: "svg",
    label: "IG",
    displayName: "IG",
    loginLabel: "Live",
    accountCount: "1 account",
    accountNumber: "IG-90821",
    tradeCount: "7 trades",
  },
  {
    service: "thor",
    slug: "thor",
    ext: "png",
    label: "Thor",
    displayName: "Thor",
    loginLabel: "ETP",
    accountCount: "1 account",
    accountNumber: "TH-22019",
    tradeCount: "12 trades",
  },
];

export type FileImportChip = {
  readonly slug: string;
  readonly ext: "png" | "svg";
  readonly label: string;
};

/**
 * Platform CSV Import entries from import/config/platforms.tsx.
 * Duplicate-logo rows (rithmic-orders) are collapsed; csv-ai / manual-entry
 * have no broker mark so they stay off the strip.
 */
export const fileImportChips: FileImportChip[] = [
  { slug: "tradovate", ext: "png", label: "Tradovate" },
  { slug: "topstep", ext: "png", label: "Topstep" },
  { slug: "ninjatrader", ext: "png", label: "NinjaTrader" },
  { slug: "quantower", ext: "png", label: "Quantower" },
  { slug: "rithmic", ext: "png", label: "Rithmic" },
  { slug: "atas", ext: "png", label: "ATAS" },
  { slug: "tradezella", ext: "png", label: "TradeZella" },
  { slug: "ig", ext: "svg", label: "IG" },
  { slug: "ftmo", ext: "svg", label: "FTMO" },
  { slug: "deepcharts", ext: "png", label: "DeepCharts" },
];

export const propFirmCaption = {
  eyebrow: "Accounts",
  title: "Manage your accounts and track your performance.",
} as const;

export const propFirmCardCopy = {
  balance: "Balance",
  remainingToTarget: "Remaining to Target",
  drawdown: "Drawdown",
  remainingLoss: (amount: string) => `$${amount} remaining`,
  daysBeforeNextPayment: " days before next payment",
  consistency: "Consistency",
  consistent: "Consistent",
  tradingDays: "Trading Days",
} as const;

export type PromoPropAccount = {
  readonly firm: string;
  readonly number: string;
  readonly daysToPayment: number;
  readonly currentBalance: number;
  readonly remainingToTarget: number;
  readonly progress: number;
  readonly remainingLoss: number;
  readonly drawdownProgress: number;
  readonly startingBalance: number;
  readonly profitTarget: number;
  readonly drawdown: number;
  readonly tradingDays: string;
  readonly consistent: boolean;
};

/**
 * Firm names + size rules from config.ts. Balances sit under each template's
 * profit target so the card still reads as in-progress, using the landing
 * monthly P&L ($3,860) as the shared performance story.
 */
export const promoPropAccounts: PromoPropAccount[] = [
  {
    firm: "Apex Trader Funding",
    number: "APX-50K-1842",
    daysToPayment: 12,
    currentBalance: 52480,
    remainingToTarget: 520,
    progress: 83,
    remainingLoss: 2180,
    drawdownProgress: 13,
    startingBalance: 50000,
    profitTarget: 3000,
    drawdown: 2500,
    tradingDays: "14/16",
    consistent: true,
  },
  {
    firm: "TopStep",
    number: "TS-50K-2201",
    daysToPayment: 4,
    currentBalance: 51960,
    remainingToTarget: 1040,
    progress: 65,
    remainingLoss: 1640,
    drawdownProgress: 18,
    startingBalance: 50000,
    profitTarget: 3000,
    drawdown: 2000,
    tradingDays: "11/14",
    consistent: true,
  },
  {
    firm: "Earn2Trade",
    number: "E2T-TCP50-0914",
    daysToPayment: 18,
    currentBalance: 51890,
    remainingToTarget: 1110,
    progress: 63,
    remainingLoss: 1420,
    drawdownProgress: 29,
    startingBalance: 50000,
    profitTarget: 3000,
    drawdown: 2000,
    tradingDays: "10/12",
    consistent: true,
  },
];
