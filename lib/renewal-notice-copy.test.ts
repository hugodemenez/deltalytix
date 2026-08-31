import { describe, expect, test } from "vitest";
import {
  buildRenewalCalendar,
  buildRenewalNoticeCopy,
  resolveRenewalCalendarDates,
  resolveRenewalNoticeFirstName,
} from "./renewal-notice-copy";

describe("renewal notice copy lock", () => {
  test("EN n=7 uses Paper strings", () => {
    const t = buildRenewalNoticeCopy({
      language: "en",
      firstName: "Hugo",
      propFirmName: "Apex",
      daysUntilRenewal: 7,
    });

    expect(t.kicker).toBe("Account payment");
    expect(t.greeting).toBe("Hi Hugo,");
    expect(t.h1).toBe("Apex payment in 7 days.");
    expect(t.lede).toBe("Auto-renew monthly is set at the firm.");
    expect(t.firmLabel).toBe("Firm");
    expect(t.accountLabel).toBe("Account");
    expect(t.caption).toBe("7 days left");
    expect(t.quiet).toBe(
      "You can change when we remind you, or turn this notice off for this account.",
    );
    expect(t.ctaPrimary).toBe("Change reminder");
    expect(t.ctaQuiet).toBe("Turn off this notice");
    expect(t.unsubscribe).toBe("Unsubscribe from renewal notifications");
  });

  test("EN n=1 uses tomorrow / 1 day left", () => {
    const t = buildRenewalNoticeCopy({
      language: "en",
      firstName: "Hugo",
      propFirmName: "Apex",
      daysUntilRenewal: 1,
    });

    expect(t.h1).toBe("Apex payment tomorrow.");
    expect(t.caption).toBe("1 day left");
  });

  test("FR Dumas lock, including n=1", () => {
    const week = buildRenewalNoticeCopy({
      language: "fr",
      firstName: "Hugo",
      propFirmName: "Apex",
      daysUntilRenewal: 7,
    });
    const tomorrow = buildRenewalNoticeCopy({
      language: "fr",
      firstName: "Hugo",
      propFirmName: "Apex",
      daysUntilRenewal: 1,
    });

    expect(week.kicker).toBe("Paiement du compte");
    expect(week.greeting).toBe("Bonjour Hugo,");
    expect(week.h1).toBe("Paiement Apex dans 7 jours.");
    expect(week.lede).toBe(
      "Le renouvellement automatique mensuel est réglé auprès de la prop firm.",
    );
    expect(week.firmLabel).toBe("Prop firm");
    expect(week.accountLabel).toBe("Compte");
    expect(week.caption).toBe("Plus que 7 jours");
    expect(week.quiet).toBe(
      "Vous pouvez changer le moment du rappel, ou désactiver cet avis pour ce compte.",
    );
    expect(week.ctaPrimary).toBe("Modifier le rappel");
    expect(week.ctaQuiet).toBe("Désactiver cet avis");
    expect(week.unsubscribe).toBe("Se désabonner des avis de paiement de compte");

    expect(tomorrow.h1).toBe("Paiement Apex demain.");
    expect(tomorrow.caption).toBe("Plus qu'un jour.");
  });

  test("first name ignores email local-parts", () => {
    expect(resolveRenewalNoticeFirstName("hugo@example.com")).toBe("Trader");
    expect(resolveRenewalNoticeFirstName("  ")).toBe("Trader");
    expect(resolveRenewalNoticeFirstName("Hugo")).toBe("Hugo");
  });
});

describe("renewal notice calendar", () => {
  test("September 2026 is Monday-start with today, range, and payment", () => {
    const calendar = buildRenewalCalendar({
      language: "en",
      today: { year: 2026, month: 8, day: 5 },
      payment: { year: 2026, month: 8, day: 12 },
    });

    expect(calendar.monthName).toBe("September");
    expect(calendar.weekdays).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(calendar.weeks[0].map((cell) => cell.day)).toEqual([
      null,
      1,
      2,
      3,
      4,
      5,
      6,
    ]);
    expect(calendar.weeks[0][5]?.kind).toBe("today");
    expect(calendar.weeks[0][6]?.kind).toBe("range");
    expect(calendar.weeks[1].map((cell) => cell.kind)).toEqual([
      "range",
      "range",
      "range",
      "range",
      "range",
      "payment",
      "plain",
    ]);
  });

  test("ISO payment dates parse as civil dates", () => {
    const dates = resolveRenewalCalendarDates({
      now: "2026-09-05T00:00:00.000Z",
      nextPaymentDate: "2026-09-12T00:00:00.000Z",
      daysUntilRenewal: 7,
    });

    expect(dates.today).toEqual({ year: 2026, month: 8, day: 5 });
    expect(dates.payment).toEqual({ year: 2026, month: 8, day: 12 });
  });
});
