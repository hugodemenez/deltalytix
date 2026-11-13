import { describe, expect, it } from "vitest";

import { MCP_TOOLS } from "@/lib/mcp/catalog";
import {
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

describe("privacy analytics copy", () => {
  it("states cookieless measurement before consent and the regional opt-out (EN)", () => {
    expect(en.privacy.analytics.beforeConsent).toMatch(/no cookies/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no localStorage/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no stored identifier/i);
    expect(en.privacy.analytics.beforeConsent).toMatch(/no session replay/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/opt out/i);
    expect(en.privacy.analytics.otherRegions).toMatch(/United States/i);
    expect(en.privacy.analytics.conversions).toMatch(/pseudonymous/i);
  });

  it("states the same facts in French", () => {
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans cookie/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans localStorage/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans identifiant stocké/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans replay/i);
    expect(fr.privacy.analytics.otherRegions).toMatch(/États-Unis/);
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
    expect(en.privacy.contact.email).toBe("privacy@deltalytix.app");
    expect(en.privacy.retention.tradesJournal).toMatch(/while your account exists/i);
    expect(en.privacy.retention.tradesJournal).toMatch(/delete your account/i);
    expect(en.privacy.retention.tokens).toMatch(/revoke/i);
    expect(en.privacy.retention.billing).toMatch(/legally required/i);
    expect(en.privacy.retention.logs).toMatch(/do not store MCP/i);
    expect(en.privacy.processors.supabase).toMatch(/Supabase/);
    expect(en.privacy.processors.stripe).toMatch(/Stripe/);
    expect(en.privacy.processors.posthog).toMatch(/PostHog/);
    expect(en.privacy.processors.resend).toMatch(/Resend/);
    expect(en.privacy.processors.vercel).toMatch(/Vercel/);
    expect(en.privacy.processors.aiProviders).toMatch(/OpenAI/);
    expect(en.privacy.collect.aiChat).toMatch(/dashboard AI|support assistant/i);
    expect(en.privacy.rights.access).toMatch(/Access and update/i);
    expect(en.privacy.rights.export).toMatch(/CSV/i);
    expect(en.privacy.rights.delete).toMatch(/Delete your account/i);
    expect(en.privacy.rights.analytics).toMatch(/Opt out of analytics/i);
    expect(en.privacy.legal.basis).toMatch(/GDPR|contract|consent/i);
  });

  it("names the same facts in French", () => {
    expect(fr.privacy.lastUpdated).toMatch(/13 novembre 2026/);
    expect(fr.privacy.contact.email).toBe("privacy@deltalytix.app");
    expect(fr.privacy.retention.tradesJournal).toMatch(/tant que votre compte existe/i);
    expect(fr.privacy.retention.tradesJournal).toMatch(/supprimez votre compte/i);
    expect(fr.privacy.processors.supabase).toMatch(/Supabase/);
    expect(fr.privacy.processors.stripe).toMatch(/Stripe/);
    expect(fr.privacy.processors.posthog).toMatch(/PostHog/);
    expect(fr.privacy.processors.resend).toMatch(/Resend/);
    expect(fr.privacy.processors.vercel).toMatch(/Vercel/);
    expect(fr.privacy.processors.aiProviders).toMatch(/OpenAI/);
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
  });

  it("covers the same AI apps facts in French", () => {
    expect(fr.privacy.aiApps.scopes).toMatch(/lecture seule/i);
    expect(fr.privacy.aiApps.access).toMatch(/utilisateur connecté/i);
    expect(fr.privacy.aiApps.access).toMatch(/pas d'accès inter-utilisateurs/i);
    expect(fr.privacy.aiApps.secrets).toMatch(/jamais renvoyés/i);
    expect(fr.privacy.aiApps.revoke).toMatch(/Paramètres → Connexions/);
    expect(fr.privacy.aiApps.logging).toMatch(/ne stockons pas/i);
  });
});

describe("privacy MCP tool table coverage", () => {
  it("lists every tool registered in MCP_TOOLS, in the same order", () => {
    expect(mcpToolPrivacyNames()).toEqual(MCP_TOOLS.map((tool) => tool.name));
    expect(MCP_TOOL_PRIVACY_ROWS.map((row) => row.scope)).toEqual(
      MCP_TOOLS.map((tool) => tool.scope),
    );
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
    ]) {
      expect(names.has(required as (typeof MCP_TOOLS)[number]["name"])).toBe(true);
    }
  });

  it("gives non-empty EN and FR input/output disclosures for every tool", () => {
    for (const row of MCP_TOOL_PRIVACY_ROWS) {
      expect(row.inputs.en.length).toBeGreaterThan(10);
      expect(row.inputs.fr.length).toBeGreaterThan(10);
      expect(row.outputs.en.length).toBeGreaterThan(10);
      expect(row.outputs.fr.length).toBeGreaterThan(10);
    }
  });
});
