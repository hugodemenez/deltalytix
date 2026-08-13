import { render } from "@react-email/render";
import { describe, expect, test } from "vitest";
import TraderStatsEmail from "./weekly-recap";

const mockDailyPnL = [
  { date: new Date(Date.UTC(2026, 7, 3)), pnl: 420 },
  { date: new Date(Date.UTC(2026, 7, 4)), pnl: 150 },
  { date: new Date(Date.UTC(2026, 7, 5)), pnl: -90 },
  { date: new Date(Date.UTC(2026, 7, 6)), pnl: 310 },
  { date: new Date(Date.UTC(2026, 7, 7)), pnl: 85 },
];

const baseProps = {
  email: "trader@example.com",
  firstName: "Sam",
  dailyPnL: mockDailyPnL,
  winLossStats: { wins: 18, losses: 7 },
  resultAnalysisIntro:
    "Five sessions this week, Thursday carrying most of the size.",
  tipsForNextWeek: "Keep sizing where the week already worked.",
};

describe("TraderStatsEmail weekly recap Zeno chrome lock", () => {
  test("renders green-week EN on Zeno 680px chrome (not 9OS-0 gray card)", async () => {
    const html = await render(
      TraderStatsEmail({
        ...baseProps,
        language: "en",
      }),
    );

    // Content lock (9OS-0 slot)
    expect(html).toContain("Week of 3–9 Aug");
    expect(html).toContain("Hello Sam,");
    expect(html).toContain(
      "This recap is generated automatically and may contain errors.",
    );
    expect(html).toContain("+875€");
    expect(html).toContain("Daily");
    expect(html).toContain("Wins and losses");
    expect(html).toContain("Win rate");
    expect(html).toContain("72%");
    expect(html).not.toContain("72.0%");
    expect(html).toContain("Visit dashboard");
    expect(html).toContain("Book a call*");
    expect(html).toContain("Hugo Demenez");
    expect(html).toContain("Founder of Deltalytix");
    expect(html).toContain("—");

    // Zeno chrome shell
    expect(html).toContain('name="color-scheme" content="light dark"');
    expect(html).toContain("supported-color-schemes");
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain("[data-ogsc] .dm-bg");
    expect(html).toContain(".dm-heading");
    expect(html).toContain(".dm-button");
    expect(html).toContain("Geist,Arial,Helvetica,sans-serif");
    expect(html).toContain('width="680"');
    expect(html).toContain("max-width:680px");
    expect(html).toContain("padding-top:24px");
    expect(html).toContain("padding-right:8px");
    expect(html).toContain("padding-top:38px");
    expect(html).toContain("padding-left:12px");
    expect(html).toContain("deltalytix-mark.png");
    expect(html).toContain("deltalytix-mark-light.png");
    expect(html).toContain("brand-mark-light");
    expect(html).toContain("brand-mark-dark");
    expect(html).toContain("#EFF5EC");
    expect(html).toContain("dm-surface-green");
    expect(html).toContain("#222722");
    expect(html).toContain("border-radius:6px");
    expect(html).toContain("#e6e8e4");
    expect(html).toContain("Privacy policy");
    expect(html).toContain("opted in to weekly trading recaps");

    // Not Drop 9OS-0 gray card
    expect(html).not.toContain("#FAFAFA");
    expect(html).not.toContain("#F5F5F5");
    expect(html).not.toContain("max-width:600px");
    expect(html).not.toContain('maxWidth: "600px"');
    expect(html).not.toContain("#171717");
    expect(html).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).not.toContain("{{{FIRST_NAME|Trader}}}");
    expect(html).not.toContain("#3469DF");
    expect(html).not.toContain("Success Rate");
    expect(html).not.toContain("last 14 days");
    expect(html).not.toContain("learning opportunity");
    expect(html).not.toContain("Trading Activity");

    // UTMs on CTAs; unsubscribe untagged
    expect(html).toContain("utm_source=resend");
    expect(html).toContain("utm_medium=email");
    expect(html).toContain("utm_campaign=weekly_recap");
    expect(html).toContain(
      "cal.com/hugo-demenez/deltalytix-discussion?utm_source=resend",
    );
    expect(html).toContain("/en/dashboard?utm_source=resend");
    expect(html).toContain(
      "/api/email/unsubscribe?email=trader%40example.com",
    );
    expect(html).not.toMatch(
      /unsubscribe\?email=[^"']+utm_/,
    );
  });

  test("renders green-week FR copy with Zeno chrome", async () => {
    const html = await render(
      TraderStatsEmail({
        ...baseProps,
        language: "fr",
        resultAnalysisIntro: "Cinq sessions cette semaine.",
        tipsForNextWeek: "Gardez la taille là où ça a marché.",
      }),
    );

    expect(html).toContain("Semaine du 3–9 août");
    expect(html).toContain("Bonjour Sam,");
    expect(html).toContain(
      "Ce récapitulatif est généré automatiquement et peut contenir des erreurs.",
    );
    expect(html).toContain("Journalier");
    expect(html).toContain("Gains et pertes");
    expect(html).toContain("Taux de gains");
    expect(html).toContain("Visiter le tableau de bord");
    expect(html).toContain("Fondateur de Deltalytix");
    expect(html).toContain("Politique de confidentialité");
    expect(html).toContain("/fr/dashboard?utm_source=resend");
    expect(html).toContain("/fr/privacy");
    expect(html).toContain('width="680"');
    expect(html).not.toContain("#FAFAFA");
  });

  test("empty weekdays render an em dash instead of zero", async () => {
    const html = await render(
      TraderStatsEmail({
        ...baseProps,
        language: "en",
        dailyPnL: [{ date: new Date(Date.UTC(2026, 7, 3)), pnl: 100 }],
      }),
    );

    expect(html).toContain("+100€");
    expect(html).toContain("—");
    expect(html).not.toContain(">0€<");
  });

  test("does not K-truncate euro amounts", async () => {
    const html = await render(
      TraderStatsEmail({
        ...baseProps,
        language: "en",
        dailyPnL: [
          { date: new Date(Date.UTC(2026, 7, 3)), pnl: 1250 },
          { date: new Date(Date.UTC(2026, 7, 4)), pnl: -1100 },
        ],
      }),
    );

    expect(html).toContain("+1250€");
    expect(html).toContain("−1100€");
    expect(html).not.toMatch(/\d+K€/);
    expect(html).not.toContain("+1K");
  });
});
