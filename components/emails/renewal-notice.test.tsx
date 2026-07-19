import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import RenewalNoticeEmail from "./renewal-notice";

describe("RenewalNoticeEmail", () => {
  it("renders the renewal content instead of an empty React shell", async () => {
    const html = await render(
      RenewalNoticeEmail({
        userFirstName: "Hugo",
        userEmail: "hugo@example.com",
        accountName: "TFDRA_5044AU8",
        propFirmName: "Test Prop Firm",
        nextPaymentDate: "July 20, 2026",
        daysUntilRenewal: 1,
        paymentFrequency: "monthly",
        language: "en",
        unsubscribeUrl: "https://deltalytix.app/settings/notifications",
      }),
    );

    expect(html).toContain("Account Renewal Notice");
    expect(html).toContain("TFDRA_5044AU8");
    expect(html).not.toContain("<template></template>");
  });
});
