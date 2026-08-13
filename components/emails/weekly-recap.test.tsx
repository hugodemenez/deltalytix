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
  tipsForNextWeek:
    "Keep sizing where the week already worked.",
};

describe("TraderStatsEmail weekly recap visual lock", () => {
  test("renders green-week EN layout locked to Paper 9OS-0", async () => {
    const html = await render(
      TraderStatsEmail({
        ...baseProps,
        language: "en",
      }),
    );

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
    expect(html).toContain("border-radius:4px");
    expect(html).toContain("#171717");
    expect(html).toContain("#E5E5E5");
    expect(html).toContain("#FAFAFA");
    expect(html).not.toContain("#F5F5F5");
    expect(html).toContain("#737373");
    expect(html).toContain("font-size:22px");
    expect(html).toContain("line-height:28px");
    expect(html).toContain("font-size:32px");
    expect(html).toContain("line-height:36px");
    expect(html).toContain("font-size:13px");
    expect(html).toContain("font-weight:600");
    expect(html).toContain("font-size:14px");
    expect(html).toContain("line-height:22px");
    expect(html).toContain("border-top:1px solid #E5E5E5");
    expect(html).toContain("text-align:left");
    expect(html).toContain('font-weight:600');
    expect(html).not.toContain('font-weight:700');
    expect(html).not.toContain("#3469DF");
    expect(html).not.toContain("Success Rate");
    expect(html).not.toContain("last 14 days");
    expect(html).not.toContain("learning opportunity");
    expect(html).not.toContain("Trading Activity");
    expect(html).toContain("—");
  });

  test("renders green-week FR copy", async () => {
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
