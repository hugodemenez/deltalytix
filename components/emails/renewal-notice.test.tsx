import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import RenewalNoticeEmail from "./renewal-notice";

const paperProps = {
  userFirstName: "Hugo",
  userEmail: "hugo@example.com",
  accountName: "LOCAL-SIM-001",
  propFirmName: "Apex",
  nextPaymentDate: "2026-09-12",
  daysUntilRenewal: 7,
  paymentFrequency: "monthly",
  unsubscribeUrl: "https://www.deltalytix.app/settings/notifications",
  now: "2026-09-05",
} as const;

describe("RenewalNoticeEmail Paper lock", () => {
  it("renders EN chrome, copy, greeting, and calendar rules", async () => {
    const html = await render(
      RenewalNoticeEmail({
        ...paperProps,
        language: "en",
      }),
    );

    expect(html).toContain("Hi Hugo,");
    expect(html).toContain("Apex payment in 7 days.");
    expect(html).toContain("Account payment");
    expect(html).toContain("Auto-renew monthly is set at the firm.");
    expect(html).toContain("Firm");
    expect(html).toContain("Account");
    expect(html).toContain("LOCAL-SIM-001");
    expect(html).toContain("Apex");
    expect(html).toContain("September");
    expect(html).toMatch(/calendar-month[^>]*font-weight:400/);
    expect(html).not.toMatch(/calendar-month[^>]*font-weight:600/);
    expect(html).toContain("7 days left");
    expect(html).toContain(
      "You can change when we remind you, or turn this notice off for this account.",
    );
    expect(html).toContain("Change reminder");
    expect(html).toContain("Turn off this notice");
    expect(html).toContain("Unsubscribe from renewal notifications");
    expect(html).toContain("/settings/notifications");
    expect(html).toContain("/dashboard");
    expect(html).toContain("Hugo");
    expect(html).toContain("Deltalytix");

    expect(html).toContain("#F7F7F4");
    expect(html).toContain("#EFF5EC");
    expect(html).toContain("#222722");
    expect(html).toContain("border-radius:12px");
    expect(html).toContain("border-radius:6px");
    expect(html).toContain("Geist,Arial,Helvetica,sans-serif");
    expect(html).toContain('width="22"');
    expect(html).toContain("deltalytix-mark.png");
    expect(html).toContain("max-width:100%");
    expect(html).toContain(".cta-button-link");
    expect(html).toContain("white-space: normal !important");
    expect(html).not.toContain('width="680"');
    expect(html).not.toContain("max-width:680px");
    expect(html).not.toContain("max-width:600px");

    expect(html).toContain("day-today");
    expect(html).toContain("day-payment");
    expect(html).toContain("day-range");

    expect(html).not.toContain("Manage Account");
    expect(html).not.toContain("Contact Support");
    expect(html).not.toContain("Account Renewal Notice");
    expect(html).not.toContain("Frequency");
    expect(html).not.toContain("Next Payment");
    expect(html).not.toContain("<template></template>");
    expect(html).not.toContain("@example.com");
    expect(html).not.toContain("hugo@");
  });

  it("renders FR Dumas lock even when Paper frames still show first-draft copy", async () => {
    const html = await render(
      RenewalNoticeEmail({
        ...paperProps,
        language: "fr",
      }),
    );

    expect(html).toContain("Bonjour Hugo,");
    expect(html).toContain("Paiement Apex dans 7 jours.");
    expect(html).toContain("Paiement du compte");
    expect(html).toContain(
      "Le renouvellement automatique mensuel est réglé auprès de la prop firm.",
    );
    expect(html).toContain("Prop firm");
    expect(html).toContain("Compte");
    expect(html).toContain("Plus que 7 jours");
    expect(html).toContain(
      "Vous pouvez changer le moment du rappel, ou désactiver cet avis pour ce compte.",
    );
    expect(html).toContain("Modifier le rappel");
    expect(html).toContain("Désactiver cet avis");
    expect(html).toContain("Se désabonner des avis de paiement de compte");
    expect(html).toContain("Septembre");
    expect(html).not.toContain("September");
    expect(html).toMatch(/calendar-month[^>]*font-weight:400/);

    expect(html).not.toContain("chez la firm");
    expect(html).not.toContain("Avis de Renouvellement");
    expect(html).not.toContain("Gérer le Compte");
  });

  it("uses n=1 strings and does not duplicate the due date as a panel row", async () => {
    const html = await render(
      RenewalNoticeEmail({
        ...paperProps,
        daysUntilRenewal: 1,
        nextPaymentDate: "2026-09-06",
        language: "en",
      }),
    );

    expect(html).toContain("Apex payment tomorrow.");
    expect(html).toContain("1 day left");
    expect(html).not.toContain("September 6, 2026");
    expect(html).not.toContain("Next Payment Date");
  });

  it("does not greet with an email local-part", async () => {
    const html = await render(
      RenewalNoticeEmail({
        ...paperProps,
        userFirstName: "local-sim@deltalytix.local",
        language: "en",
      }),
    );

    expect(html).toContain("Hi Trader,");
    expect(html).not.toContain("Hi local-sim");
  });
});
