import { describe, expect, it } from "vitest";

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
    expect(en.privacy.thirdParty.content).not.toMatch(
      /We do not use third-party analytics services/,
    );
  });

  it("states the same facts in French", () => {
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans cookie/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans localStorage/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans identifiant stocké/i);
    expect(fr.privacy.analytics.beforeConsent).toMatch(/sans replay/i);
    expect(fr.privacy.analytics.otherRegions).toMatch(/États-Unis/);
    expect(fr.privacy.thirdParty.content).not.toMatch(
      /Nous n'utilisons pas de services d'analyse tiers/,
    );
  });
});

describe("privacy OpenAI / Apps checklist copy", () => {
  it("keeps the same locale keys in English and French", () => {
    expect(Object.keys(flatten(fr.privacy)).sort()).toEqual(
      Object.keys(flatten(en.privacy)).sort(),
    );
  });

  it("names retention, processors, contact, and user controls (EN)", () => {
    expect(en.privacy.lastUpdated).toMatch(/1 November 2026/);
    expect(en.privacy.contact.email).toBe("privacy@deltalytix.app");
    expect(en.privacy.retention.content).toMatch(/while your account exists/i);
    expect(en.privacy.retention.content).toMatch(/delete your account/i);
    expect(en.privacy.processors.supabase).toMatch(/Supabase/);
    expect(en.privacy.processors.stripe).toMatch(/Stripe/);
    expect(en.privacy.processors.posthog).toMatch(/PostHog/);
    expect(en.privacy.processors.resend).toMatch(/Resend/);
    expect(en.privacy.rights.access).toMatch(/Access and update/i);
    expect(en.privacy.rights.delete).toMatch(/Delete your account/i);
    expect(en.privacy.rights.analytics).toMatch(/Opt out of analytics/i);
  });

  it("names the same facts in French", () => {
    expect(fr.privacy.lastUpdated).toMatch(/1 novembre 2026/);
    expect(fr.privacy.contact.email).toBe("privacy@deltalytix.app");
    expect(fr.privacy.retention.content).toMatch(/tant que votre compte existe/i);
    expect(fr.privacy.retention.content).toMatch(/supprimez votre compte/i);
    expect(fr.privacy.processors.supabase).toMatch(/Supabase/);
    expect(fr.privacy.processors.stripe).toMatch(/Stripe/);
    expect(fr.privacy.processors.posthog).toMatch(/PostHog/);
    expect(fr.privacy.processors.resend).toMatch(/Resend/);
    expect(fr.privacy.rights.access).toMatch(/Consultez et mettez à jour/i);
    expect(fr.privacy.rights.delete).toMatch(/Supprimez votre compte/i);
    expect(fr.privacy.rights.analytics).toMatch(/Refusez la mesure d'audience/i);
  });

  it("covers all public API / MCP connectors, not ChatGPT only (EN)", () => {
    const connectors = [
      en.privacy.connectors.lead,
      en.privacy.connectors.scopes,
      en.privacy.connectors.toolsLead,
      en.privacy.connectors.toolProfile,
      en.privacy.connectors.toolAccounts,
      en.privacy.connectors.toolTrades,
      en.privacy.connectors.toolMetrics,
      en.privacy.connectors.toolAccountMetrics,
      en.privacy.connectors.toolEquity,
      en.privacy.connectors.toolDailyPnl,
      en.privacy.connectors.toolConnections,
      en.privacy.connectors.access,
      en.privacy.connectors.secrets,
      en.privacy.connectors.revoke,
      en.privacy.processors.authorizedApps,
    ].join(" ");

    expect(connectors).toMatch(/ChatGPT/);
    expect(connectors).toMatch(/Claude/);
    expect(connectors).toMatch(/Cursor/);
    expect(connectors).toMatch(/https:\/\/www\.deltalytix\.app\/api\/mcp/);
    expect(connectors).toMatch(/profile:read/);
    expect(connectors).toMatch(/accounts:read/);
    expect(connectors).toMatch(/trades:read/);
    expect(connectors).toMatch(/metrics:read/);
    expect(connectors).toMatch(/connections:read/);
    expect(connectors).toMatch(/get_profile/);
    expect(connectors).toMatch(/list_accounts/);
    expect(connectors).toMatch(/list_trades/);
    expect(connectors).toMatch(/get_metrics_summary/);
    expect(connectors).toMatch(/get_account_metrics/);
    expect(connectors).toMatch(/get_equity_curve/);
    expect(connectors).toMatch(/get_daily_pnl/);
    expect(connectors).toMatch(/list_connections/);
    expect(en.privacy.connectors.toolsLead).toMatch(/read-only/i);
    expect(en.privacy.connectors.access).toMatch(/signed-in user's data/i);
    expect(en.privacy.connectors.access).toMatch(/no cross-user access/i);
    expect(en.privacy.connectors.secrets).toMatch(/never returned/i);
    expect(en.privacy.connectors.revoke).toMatch(/Settings → Connections/);
  });

  it("covers the same connector facts in French", () => {
    const connectors = [
      fr.privacy.connectors.lead,
      fr.privacy.connectors.scopes,
      fr.privacy.connectors.toolsLead,
      fr.privacy.connectors.toolProfile,
      fr.privacy.connectors.toolAccounts,
      fr.privacy.connectors.toolTrades,
      fr.privacy.connectors.toolMetrics,
      fr.privacy.connectors.toolAccountMetrics,
      fr.privacy.connectors.toolEquity,
      fr.privacy.connectors.toolDailyPnl,
      fr.privacy.connectors.toolConnections,
      fr.privacy.connectors.access,
      fr.privacy.connectors.secrets,
      fr.privacy.connectors.revoke,
      fr.privacy.processors.authorizedApps,
    ].join(" ");

    expect(connectors).toMatch(/ChatGPT/);
    expect(connectors).toMatch(/Claude/);
    expect(connectors).toMatch(/Cursor/);
    expect(connectors).toMatch(/https:\/\/www\.deltalytix\.app\/api\/mcp/);
    expect(connectors).toMatch(/profile:read/);
    expect(fr.privacy.connectors.toolsLead).toMatch(/lecture seule/i);
    expect(fr.privacy.connectors.access).toMatch(/utilisateur connecté/i);
    expect(fr.privacy.connectors.access).toMatch(/pas d'accès inter-utilisateurs/i);
    expect(fr.privacy.connectors.secrets).toMatch(/jamais renvoyés/i);
    expect(fr.privacy.connectors.revoke).toMatch(/Paramètres → Connexions/);
  });
});
