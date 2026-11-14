import { describe, expect, it } from "vitest";

import { MCP_TOOLS, type McpToolName } from "@/lib/mcp/catalog";
import { mcpToolInputKeys } from "@/lib/mcp/tool-input-schemas";
import {
  buildMcpOutputFixtures,
  fixtureOutputKeys,
  normalizeOutputKey,
} from "@/lib/privacy/mcp-output-fixtures";
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

function wholeTokenMatch(disclosure: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^A-Za-z0-9_])${escaped}(?:$|[^A-Za-z0-9_])`).test(
    disclosure,
  );
}

describe("privacy analytics copy", () => {
  it("states cookieless measurement before consent and the regional opt-out (EN)", () => {
    expect(en.privacy.analytics.beforeConsent).toMatch(/no cookies/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no localStorage/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no stored identifier/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no session replay/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/opt out/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/United States/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/browser analytics/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/server-side/i);
    expect(en.privacy.analytics.conversions).toMatch(/pseudonymous/i);
    expect(en.privacy.analytics.provider).toMatch(/Google Analytics 4|GA4/);
    expect(en.privacy.analytics.provider).toMatch(/Vercel Web Analytics/);
    expect(en.privacy.analytics.vercel).toMatch(/cookieless/i);
    expect(en.privacy.analytics.vercel).toMatch(/opt out/i);
  });

  it("states the same facts in French", () => {
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans cookie/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans localStorage/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans identifiant stocké/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans replay/i);
    expect(fr.privacy.analytics.otherRegions).toMatch(/États-Unis/);
    expect(fr.privacy.analytics.otherRegions).toMatch(/navigateur/i);
    expect(fr.privacy.analytics.provider).toMatch(/Google Analytics 4|GA4/);
    expect(fr.privacy.analytics.provider).toMatch(/Vercel Web Analytics/);
    expect(fr.privacy.analytics.vercel).toMatch(/sans cookie/i);
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
    expect(en.privacy.intro.controller).not.toMatch(/to be confirmed/i);
    expect(en.privacy.retention.tradesJournal).toMatch(/while your account exists/i);
    expect(en.privacy.retention.tradesJournal).toMatch(/delete your account/i);
    expect(en.privacy.retention.tradesJournal).toMatch(/attempt/i);
    expect(en.privacy.retention.tradesJournal).toMatch(/file storage/i);
    expect(en.privacy.retention.tokens).toMatch(/revoke/i);
    expect(en.privacy.retention.billing).toMatch(/Stripe/);
    expect(en.privacy.retention.logs).toMatch(/do not keep MCP tool arguments/i);
    expect(en.privacy.retention.analytics).toMatch(/up to 7 years/i);
    expect(en.privacy.retention.analytics).not.toMatch(/1–2 years|1-2 years/);
    expect(en.privacy.retention.aiChat).toMatch(/Reset/i);
    expect(en.privacy.processors.supabase).toMatch(/Supabase/);
    expect(en.privacy.processors.supabase).toMatch(/screenshots/i);
    expect(en.privacy.processors.supabase).not.toMatch(/trade-images bucket/);
    expect(en.privacy.processors.stripe).toMatch(/Stripe/);
    expect(en.privacy.processors.posthog).toMatch(/PostHog/);
    expect(en.privacy.processors.posthog).toMatch(/up to 7 years/);
    expect(en.privacy.processors.resend).toMatch(/Resend/);
    expect(en.privacy.processors.vercel).toMatch(/Vercel/);
    expect(en.privacy.processors.vercel).toMatch(/cookieless/i);
    expect(en.privacy.processors.google).toMatch(/Google Ads|GA4/);
    expect(en.privacy.processors.google).toMatch(/hashed email/i);
    expect(en.privacy.processors.google).toMatch(/Accepting ads in the EEA/i);
    expect(en.privacy.processors.aiProviders).toMatch(/currently OpenAI/i);
    expect(en.privacy.processors.aiProviders).toMatch(/not used to train/i);
    expect(en.privacy.processors.brokers).toMatch(/Rithmic/);
    expect(en.privacy.processors.brokers).toMatch(/Volumetrica|prop-firm/i);
    expect(en.privacy.processors.databento).toMatch(/Databento/);
    expect(en.privacy.processors.calcom).toMatch(/Cal\.com/);
    expect(en.privacy.collect.aiChat).toMatch(/Reset/i);
    expect(en.privacy.collect.shares).not.toMatch(/isPublic/);
    expect(en.privacy.use.newsletter).toMatch(/newsletter/i);
    expect(en.privacy.legal.basis).toMatch(/newsletter/i);
    expect(en.privacy.legal.basis).toMatch(/Stripe, not Deltalytix/i);
    expect(en.privacy.security.content).toMatch(/HTTPS|TLS/i);
    expect(en.privacy.children.content).toMatch(/16/);
    expect(en.privacy.changes.content).toMatch(/email/i);
    expect(en.privacy.rights.export).toMatch(/CSV/i);
    expect(en.privacy.rights.analytics).toMatch(/browser analytics/i);
    expect(en.privacy.analytics.conversions).toMatch(
      /Outside the EEA[\s\S]*unless you opt out[\s\S]*may include your email/i,
    );
  });

  it("names the same facts in French, including tokens and billing", () => {
    expect(fr.privacy.lastUpdated).toMatch(/13 novembre 2026/);
    expect(fr.privacy.contact.email).toBe("contact@deltalytix.app");
    expect(fr.privacy.intro.controller).toMatch(/Hugo Demenez/);
    expect(fr.privacy.intro.controller).not.toMatch(/à confirmer/i);
    expect(fr.privacy.retention.tradesJournal).toMatch(/tant que votre compte existe/i);
    expect(fr.privacy.retention.tradesJournal).toMatch(/supprimez votre compte/i);
    expect(fr.privacy.retention.tradesJournal).toMatch(/tentons|supprimer le client Stripe/i);
    expect(fr.privacy.retention.tokens).toMatch(/révocation|révoqu/i);
    expect(fr.privacy.retention.billing).toMatch(/Stripe/);
    expect(fr.privacy.retention.logs).toMatch(/ne conservons pas/i);
    expect(fr.privacy.retention.analytics).toMatch(/7 ans/);
    expect(fr.privacy.legal.basis).toMatch(/registres fiscaux et comptables/);
    expect(fr.privacy.legal.basis).toMatch(/Stripe, et non Deltalytix/);
    expect(fr.privacy.processors.supabase).toMatch(/Supabase/);
    expect(fr.privacy.processors.stripe).toMatch(/Stripe/);
    expect(fr.privacy.processors.posthog).toMatch(/PostHog/);
    expect(fr.privacy.processors.resend).toMatch(/Resend/);
    expect(fr.privacy.processors.vercel).toMatch(/Vercel/);
    expect(fr.privacy.processors.google).toMatch(/Google Ads|GA4/);
    expect(fr.privacy.processors.aiProviders).toMatch(/actuellement OpenAI/i);
    expect(fr.privacy.processors.brokers).toMatch(/Rithmic/);
    expect(fr.privacy.processors.brokers).toMatch(/Volumetrica|prop firm/i);
    expect(fr.privacy.processors.databento).toMatch(/Databento/);
    expect(fr.privacy.processors.calcom).toMatch(/Cal\.com/);
    expect(fr.privacy.collect.aiChat).toMatch(/Réinitialiser/i);
    expect(fr.privacy.use.newsletter).toMatch(/newsletter/i);
    expect(fr.privacy.security.content).toMatch(/HTTPS|TLS/i);
    expect(fr.privacy.children.content).toMatch(/16/);
    expect(fr.privacy.changes.content).toMatch(/e-mail/i);
    expect(fr.privacy.rights.access).toMatch(/Consultez et mettez à jour/i);
    expect(fr.privacy.rights.export).toMatch(/CSV/i);
    expect(fr.privacy.rights.delete).toMatch(/Supprimez votre compte/i);
    expect(fr.privacy.rights.analytics).toMatch(/navigateur/i);
    expect(fr.privacy.legal.basis).toMatch(/RGPD/i);
    expect(fr.privacy.analytics.conversions).toMatch(
      /Hors de l'EEE[\s\S]*refusez[\s\S]*e-mail/i,
    );
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
    expect(en.privacy.aiApps.access).toMatch(/no cross-user access/i);
    expect(en.privacy.aiApps.secrets).toMatch(/never returned/i);
    expect(en.privacy.aiApps.logging).toMatch(/do not store MCP tool inputs/i);
    expect(en.privacy.aiApps.revoke).toMatch(/Settings → Connections/);
    expect(en.privacy.aiApps.tableLead).toMatch(/projection of GET \/api\/v1\/metrics\/equity/);
    expect(en.privacy.aiApps.inAppAi).toMatch(/imports:write/);
    expect(en.privacy.aiApps.inAppAi).toMatch(/not used to train/i);
  });

  it("covers the same AI apps facts in French", () => {
    expect(fr.privacy.aiApps.scopes).toMatch(/lecture seule/i);
    expect(fr.privacy.aiApps.access).toMatch(/pas d'accès inter-utilisateurs/i);
    expect(fr.privacy.aiApps.secrets).toMatch(/jamais renvoyés/i);
    expect(fr.privacy.aiApps.logging).toMatch(/ne stockons pas/i);
    expect(fr.privacy.aiApps.revoke).toMatch(/Paramètres → Connexions/);
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

  it("discloses every fixture output key from real serializers (whole-token)", () => {
    const fixtures = buildMcpOutputFixtures();
    for (const tool of MCP_TOOLS) {
      const row = MCP_TOOL_PRIVACY_ROWS.find((r) => r.name === tool.name)!;
      expect(fixtures[tool.name as McpToolName]).toBeDefined();
      for (const rawKey of fixtureOutputKeys(tool.name)) {
        const key = normalizeOutputKey(rawKey);
        expect(
          wholeTokenMatch(row.outputs.en, key),
          `${tool.name} EN disclosure missing whole-token ${key} (from ${rawKey})`,
        ).toBe(true);
        expect(
          wholeTokenMatch(row.outputs.fr, key),
          `${tool.name} FR disclosure missing whole-token ${key} (from ${rawKey})`,
        ).toBe(true);
      }
      for (const hint of MCP_TOOL_OUTPUT_FIELD_HINTS[tool.name]) {
        expect(wholeTokenMatch(row.outputs.en, hint)).toBe(true);
        expect(wholeTokenMatch(row.outputs.fr, hint)).toBe(true);
      }
    }
  });

  it("states combined equity is 0 with showIndividual", () => {
    const row = MCP_TOOL_PRIVACY_ROWS.find((r) => r.name === "get_equity_curve")!;
    expect(row.outputs.en).toMatch(/combined equity is 0/);
    expect(row.outputs.fr).toMatch(/vaut 0/);
  });

  it("explains list_connections externalId and prop firm wording", () => {
    const row = MCP_TOOL_PRIVACY_ROWS.find((r) => r.name === "list_connections")!;
    expect(row.outputs.en).toMatch(/broker-side account or user identifier/i);
    expect(row.outputs.fr).toMatch(/identifiant de compte ou d'utilisateur côté courtier/i);
    const accounts = MCP_TOOL_PRIVACY_ROWS.find((r) => r.name === "list_accounts")!;
    expect(accounts.outputs.en).toMatch(/prop firm/i);
  });
});
