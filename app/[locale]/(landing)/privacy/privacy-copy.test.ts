import { describe, expect, it } from "vitest";

import { MCP_TOOLS, type McpToolName } from "@/lib/mcp/catalog";
import { mcpToolInputKeys } from "@/lib/mcp/tool-input-schemas";
import {
  MCP_TOOL_OUTPUT_FIELD_HINTS,
  MCP_TOOL_PRIVACY_ROWS,
  mcpToolPrivacyNames,
} from "@/lib/privacy/mcp-tool-disclosures";
import en from "@/locales/en/privacy";
import fr from "@/locales/fr/privacy";

const flatten = (value: unknown, prefix = ""): Record<string, string> => {
  if (typeof value === "string") return { [prefix]: value };
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce<Record<string, string>>((acc, [key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return { ...acc, ...flatten(nested, path) };
  }, {});
};

/** Fixture payloads mirroring tool return shapes (including dynamic equity keys). */
const TOOL_OUTPUT_FIXTURES: Record<McpToolName, Record<string, unknown>> = {
  get_profile: { id: "u1", email: "a@b.c", language: "en" },
  list_accounts: {
    id: "a1",
    number: "123",
    propfirm: "Demo Firm",
    startingBalance: 50000,
    createdAt: "2026-01-01T00:00:00.000Z",
    hidden: false,
    group: { id: "g1", name: "Main" },
    payouts: [{ id: "p1", amount: 100, date: "2026-01-02", status: "PAID" }],
  },
  list_trades: {
    id: "t1",
    accountNumber: "123",
    instrument: "ES",
    side: "long",
    quantity: 1,
    entryPrice: "5000",
    closePrice: "5010",
    entryDate: "2026-01-01T10:00:00.000Z",
    closeDate: "2026-01-01T11:00:00.000Z",
    pnl: 50,
    commission: 2,
    timeInPosition: 3600,
    tags: ["a"],
    comment: "note",
    createdAt: "2026-01-01T11:00:00.000Z",
  },
  get_metrics_summary: {
    totalPnl: 100,
    totalCommission: 5,
    tradeCount: 10,
    winCount: 6,
    lossCount: 4,
    breakevenCount: 0,
    winRate: 0.6,
    profitFactor: 1.5,
    averageWin: 20,
    averageLoss: -10,
    longCount: 5,
    shortCount: 5,
    tradingDays: 3,
  },
  get_account_metrics: {
    id: "a1",
    number: "123",
    balance: 50100,
    drawdown: 0.01,
    consistency: 0.8,
    progress: 0.5,
    metrics: { currentBalance: 50100 },
  },
  get_equity_curve: {
    date: "2026-01-01",
    equity: 50100,
    dailyPnL: 100,
    dailyCommissions: 2,
    netPnL: 98,
    dateRange: { startDate: "2026-01-01", endDate: "2026-01-31" },
    accountNumbers: ["123"],
    nextCursor: null,
    reset_123: true,
    payout_123: true,
    payoutStatus_123: "PAID",
    payoutAmount_123: -100,
    equity_123: 50100,
  },
  get_daily_pnl: {
    date: "2026-01-01",
    dailyPnL: 100,
    netPnL: 98,
    equity: 50100,
    dailyCommissions: 2,
    accountNumbers: ["123"],
    dateRange: { startDate: "2026-01-01", endDate: "2026-01-31" },
    nextCursor: null,
  },
  list_connections: {
    id: "c1",
    service: "tradovate",
    externalId: "broker-user-9",
    lastSyncedAt: "2026-01-01T00:00:00.000Z",
    environment: "live",
    accountNumbers: ["123"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

function fixtureKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value);
}

function disclosureCoversKey(disclosure: string, key: string): boolean {
  if (disclosure.includes(key)) return true;
  // Dynamic equity prefixes: reset_<account>, payout_<account>, etc.
  const prefixMatch = /^(reset_|payout_|payoutStatus_|payoutAmount_|equity_)/.exec(key);
  if (prefixMatch) return disclosure.includes(prefixMatch[1]);
  return false;
}

describe("privacy analytics copy", () => {
  it("states cookieless measurement before consent and the regional opt-out (EN)", () => {
    expect(en.privacy.analytics.beforeConsent).toMatch(/no cookies/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no localStorage/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no stored identifier/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no session replay/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/opt out/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/United States/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/ad_storage/);
    expect(en.privacy.analytics.conversions).toMatch(/pseudonymous/i);
    expect(en.privacy.analytics.provider).toMatch(/Google Analytics 4|GA4/);
    expect(en.privacy.analytics.provider).toMatch(/Vercel Web Analytics/);
    expect(en.privacy.analytics.vercel).toMatch(/Speed Insights/);
  });

  it("states the same facts in French", () => {
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans cookie/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans localStorage/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans identifiant stocké/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans replay/i);
    expect(fr.privacy.analytics.otherRegions).toMatch(/États-Unis/);
    expect(fr.privacy.analytics.otherRegions).toMatch(/ad_storage/);
    expect(fr.privacy.analytics.provider).toMatch(/Google Analytics 4|GA4/);
    expect(fr.privacy.analytics.provider).toMatch(/Vercel Web Analytics/);
    expect(fr.privacy.analytics.vercel).toMatch(/Speed Insights/);
  });
});

describe("privacy OpenAI / Apps checklist copy", () => {
  it("keeps the same locale keys in English and French", () => {
    expect(Object.keys(flatten(fr.privacy)).sort()).toEqual(
      Object.keys(flatten(en.privacy)).sort(),
    );
  });

  it("names retention, processors, contact, and user controls (EN)", () => {
    expect(en.privacy.lastUpdated).toMatch(/13 November 2026/);
    expect(en.privacy.contact.email).toBe("contact@deltalytix.app");
    expect(en.privacy.intro.controller).toMatch(/Hugo Demenez/);
    expect(en.privacy.retention.tradesJournal).toMatch(/while your account exists/i);
    expect(en.privacy.retention.tradesJournal).toMatch(/delete your account/i);
    expect(en.privacy.retention.tradesJournal).toMatch(/attempt/i);
    expect(en.privacy.retention.tokens).toMatch(/revoke/i);
    expect(en.privacy.retention.billing).toMatch(/Stripe/);
    expect(en.privacy.retention.logs).toMatch(/do not keep MCP tool arguments/i);
    expect(en.privacy.retention.logs).toMatch(/\/api\/v1\/trades/);
    expect(en.privacy.retention.aiChat).toMatch(/Mood\.conversation|mood conversation/i);
    expect(en.privacy.processors.supabase).toMatch(/Supabase/);
    expect(en.privacy.processors.supabase).toMatch(/trade-images|screenshots/i);
    expect(en.privacy.processors.stripe).toMatch(/Stripe/);
    expect(en.privacy.processors.posthog).toMatch(/PostHog/);
    expect(en.privacy.processors.resend).toMatch(/Resend/);
    expect(en.privacy.processors.vercel).toMatch(/Vercel/);
    expect(en.privacy.processors.vercel).toMatch(/Web Analytics|Speed Insights/);
    expect(en.privacy.processors.google).toMatch(/Google Ads|GA4/);
    expect(en.privacy.processors.google).toMatch(/SHA-256|hashed email/i);
    expect(en.privacy.processors.aiProviders).toMatch(/currently OpenAI/i);
    expect(en.privacy.processors.brokers).toMatch(/Rithmic/);
    expect(en.privacy.processors.databento).toMatch(/Databento/);
    expect(en.privacy.processors.calcom).toMatch(/Cal\.com/);
    expect(en.privacy.collect.aiChat).toMatch(/dashboard AI|auto-saved/i);
    expect(en.privacy.collect.aiFeatures).toMatch(/500 rows|batches of 50/i);
    expect(en.privacy.collect.aiFeatures).toMatch(/newsletter/i);
    expect(en.privacy.use.newsletter).toMatch(/newsletter/i);
    expect(en.privacy.legal.basis).toMatch(/newsletter/i);
    expect(en.privacy.security.content).toMatch(/HTTPS|TLS/i);
    expect(en.privacy.children.content).toMatch(/16/);
    expect(en.privacy.changes.content).toMatch(/email/i);
    expect(en.privacy.rights.access).toMatch(/Access and update/i);
    expect(en.privacy.rights.export).toMatch(/CSV/i);
    expect(en.privacy.rights.delete).toMatch(/Delete your account/i);
    expect(en.privacy.rights.analytics).toMatch(/Opt out of analytics/i);
    expect(en.privacy.legal.basis).toMatch(/GDPR|contract|consent/i);
  });

  it("names the same facts in French", () => {
    expect(fr.privacy.lastUpdated).toMatch(/13 novembre 2026/);
    expect(fr.privacy.contact.email).toBe("contact@deltalytix.app");
    expect(fr.privacy.intro.controller).toMatch(/Hugo Demenez/);
    expect(fr.privacy.retention.tradesJournal).toMatch(/tant que votre compte existe/i);
    expect(fr.privacy.retention.tradesJournal).toMatch(/supprimez votre compte/i);
    expect(fr.privacy.retention.tradesJournal).toMatch(/tentons|supprimer le client Stripe/i);
    expect(fr.privacy.retention.logs).toMatch(/ne conservons pas/i);
    expect(fr.privacy.retention.logs).toMatch(/\/api\/v1\/trades/);
    expect(fr.privacy.legal.basis).toMatch(/registres fiscaux et comptables/);
    expect(fr.privacy.processors.supabase).toMatch(/Supabase/);
    expect(fr.privacy.processors.stripe).toMatch(/Stripe/);
    expect(fr.privacy.processors.posthog).toMatch(/PostHog/);
    expect(fr.privacy.processors.resend).toMatch(/Resend/);
    expect(fr.privacy.processors.vercel).toMatch(/Vercel/);
    expect(fr.privacy.processors.google).toMatch(/Google Ads|GA4/);
    expect(fr.privacy.processors.aiProviders).toMatch(/actuellement OpenAI/i);
    expect(fr.privacy.processors.brokers).toMatch(/Rithmic/);
    expect(fr.privacy.processors.databento).toMatch(/Databento/);
    expect(fr.privacy.processors.calcom).toMatch(/Cal\.com/);
    expect(fr.privacy.collect.aiFeatures).toMatch(/500 lignes|lots de 50/i);
    expect(fr.privacy.use.newsletter).toMatch(/newsletter/i);
    expect(fr.privacy.security.content).toMatch(/HTTPS|TLS/i);
    expect(fr.privacy.children.content).toMatch(/16/);
    expect(fr.privacy.changes.content).toMatch(/e-mail/i);
    expect(fr.privacy.rights.access).toMatch(/Consultez et mettez à jour/i);
    expect(fr.privacy.rights.export).toMatch(/CSV/i);
    expect(fr.privacy.rights.delete).toMatch(/Supprimez votre compte/i);
    expect(fr.privacy.rights.analytics).toMatch(/Refusez la mesure d'audience/i);
    expect(fr.privacy.legal.basis).toMatch(/RGPD/i);
  });

  it("covers AI apps / MCP recipients and logging (EN)", () => {
    const section = [
      en.privacy.aiApps.lead,
      en.privacy.aiApps.scopes,
      en.privacy.aiApps.access,
      en.privacy.aiApps.secrets,
      en.privacy.aiApps.recipient,
      en.privacy.aiApps.logging,
      en.privacy.aiApps.revoke,
      en.privacy.aiApps.inAppAi,
      en.privacy.processors.authorizedApps,
    ].join(" ");

    expect(section).toMatch(/ChatGPT/);
    expect(section).toMatch(/Claude/);
    expect(section).toMatch(/Cursor/);
    expect(section).toMatch(/https:\/\/www\.deltalytix\.app\/api\/mcp/);
    expect(en.privacy.aiApps.scopes).toMatch(/read-only/i);
    expect(en.privacy.aiApps.access).toMatch(/signed-in user's own data/i);
    expect(en.privacy.aiApps.access).toMatch(/no cross-user access/i);
    expect(en.privacy.aiApps.secrets).toMatch(/never returned/i);
    expect(en.privacy.aiApps.recipient).toMatch(/privacy policy/i);
    expect(en.privacy.aiApps.logging).toMatch(/do not store MCP tool inputs/i);
    expect(en.privacy.aiApps.revoke).toMatch(/Settings → Connections/);
    expect(en.privacy.aiApps.tableLead).toMatch(/projection of GET \/api\/v1\/metrics\/equity/);
    expect(en.privacy.aiApps.inAppAi).toMatch(/imports:write/);
  });

  it("covers the same AI apps facts in French", () => {
    expect(fr.privacy.aiApps.scopes).toMatch(/lecture seule/i);
    expect(fr.privacy.aiApps.access).toMatch(/utilisateur connecté/i);
    expect(fr.privacy.aiApps.access).toMatch(/pas d'accès inter-utilisateurs/i);
    expect(fr.privacy.aiApps.secrets).toMatch(/jamais renvoyés/i);
    expect(fr.privacy.aiApps.revoke).toMatch(/Paramètres → Connexions/);
    expect(fr.privacy.aiApps.logging).toMatch(/ne stockons pas/i);
    expect(fr.privacy.aiApps.tableLead).toMatch(/projection de GET \/api\/v1\/metrics\/equity/);
    expect(fr.privacy.aiApps.inAppAi).toMatch(/imports:write/);
  });
});

describe("privacy MCP tool table coverage", () => {
  it("lists every registered MCP tool with matching name and scope", () => {
    const catalogNames = MCP_TOOLS.map((tool) => tool.name);
    const disclosureNames = mcpToolPrivacyNames();
    expect(new Set(disclosureNames)).toEqual(new Set(catalogNames));
    expect(disclosureNames).toHaveLength(catalogNames.length);
    for (const tool of MCP_TOOLS) {
      const row = MCP_TOOL_PRIVACY_ROWS.find((r) => r.name === tool.name);
      expect(row, tool.name).toBeDefined();
      expect(row!.scope).toBe(tool.scope);
    }
  });

  it("includes the known MCP tools OpenAI reviewers expect", () => {
    const names = new Set(mcpToolPrivacyNames());
    for (const required of [
      "get_profile",
      "list_accounts",
      "list_connections",
      "list_trades",
      "get_account_metrics",
      "get_metrics_summary",
      "get_daily_pnl",
      "get_equity_curve",
    ] as const) {
      expect(names.has(required)).toBe(true);
    }
  });

  it("discloses every zod input key for each tool (EN + FR)", () => {
    for (const tool of MCP_TOOLS) {
      const row = MCP_TOOL_PRIVACY_ROWS.find((r) => r.name === tool.name)!;
      const keys = mcpToolInputKeys(tool.name);
      if (keys.length === 0) {
        expect(row.inputs.en.toLowerCase()).toMatch(/none/);
        expect(row.inputs.fr.toLowerCase()).toMatch(/aucun/);
        continue;
      }
      for (const key of keys) {
        expect(row.inputs.en, `${tool.name} EN missing input ${key}`).toContain(key);
        expect(row.inputs.fr, `${tool.name} FR missing input ${key}`).toContain(key);
      }
    }
  });

  it("discloses every fixture output key (including equity dynamic prefixes)", () => {
    for (const tool of MCP_TOOLS) {
      const row = MCP_TOOL_PRIVACY_ROWS.find((r) => r.name === tool.name)!;
      const fixture = TOOL_OUTPUT_FIXTURES[tool.name];
      for (const key of fixtureKeys(fixture)) {
        expect(
          disclosureCoversKey(row.outputs.en, key),
          `${tool.name} EN disclosure missing ${key}`,
        ).toBe(true);
        expect(
          disclosureCoversKey(row.outputs.fr, key),
          `${tool.name} FR disclosure missing ${key}`,
        ).toBe(true);
      }
      for (const hint of MCP_TOOL_OUTPUT_FIELD_HINTS[tool.name]) {
        expect(row.outputs.en, `${tool.name} EN hint ${hint}`).toContain(hint);
        expect(row.outputs.fr, `${tool.name} FR hint ${hint}`).toContain(hint);
      }
    }
  });

  it("explains list_connections externalId and prop firm wording", () => {
    const row = MCP_TOOL_PRIVACY_ROWS.find((r) => r.name === "list_connections")!;
    expect(row.outputs.en).toMatch(/broker-side account or user identifier/i);
    expect(row.outputs.fr).toMatch(/identifiant de compte ou d'utilisateur côté courtier/i);
    const accounts = MCP_TOOL_PRIVACY_ROWS.find((r) => r.name === "list_accounts")!;
    expect(accounts.outputs.en).toMatch(/prop firm/i);
  });
});
