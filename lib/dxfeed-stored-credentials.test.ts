import { describe, expect, it } from "vitest";
import {
  getDxFeedPropFirmByHistoricalHost,
  isDxFeedStoredCredentialsOutdated,
  parseDxFeedStoredCredentials,
  resolveDxFeedPropFirmFromStoredCredentials,
  withResolvedDxFeedPropFirmId,
} from "./dxfeed-stored-credentials";

describe("dxfeed-stored-credentials", () => {
  it("parses valid stored credentials and rejects malformed values", () => {
    expect(
      parseDxFeedStoredCredentials(
        JSON.stringify({
          accessToken: "token",
          historicalHost: "https://volumetrica.miltraders.com",
        }),
      ),
    ).toEqual({
      accessToken: "token",
      historicalHost: "https://volumetrica.miltraders.com",
    });
    expect(parseDxFeedStoredCredentials("{")).toBeNull();
    expect(
      parseDxFeedStoredCredentials(JSON.stringify({ accessToken: "token" })),
    ).toBeNull();
  });

  it("resolves a prop firm from id, legacy auth name, or historical host", () => {
    expect(
      resolveDxFeedPropFirmFromStoredCredentials({
        accessToken: "token",
        historicalHost: "https://unknown.example.com",
        propFirmId: "miltraders",
      })?.id,
    ).toBe("miltraders");
    expect(
      resolveDxFeedPropFirmFromStoredCredentials({
        accessToken: "token",
        historicalHost: "https://unknown.example.com",
        propfirmName: "Phoenix Trader Funding",
      })?.id,
    ).toBe("phoenixtraderfunding");
    expect(
      resolveDxFeedPropFirmFromStoredCredentials({
        accessToken: "token",
        historicalHost: "https://volumetrica.swissfirmup.com",
      })?.id,
    ).toBe("swissfirmup");
  });

  it("matches complete host boundaries and marks unknown hosts outdated", () => {
    expect(
      getDxFeedPropFirmByHistoricalHost(
        "https://volumetrica.miltraders.com.evil.test",
      ),
    ).toBeUndefined();
    expect(
      isDxFeedStoredCredentialsOutdated({
        accessToken: "token",
        historicalHost: "https://unknown.example.com",
      }),
    ).toBe(true);
  });

  it("adds the resolved firm without dropping token metadata or cached accounts", () => {
    const migrated = withResolvedDxFeedPropFirmId(
      {
        accessToken: "token",
        historicalHost: "https://volumetrica.miltraders.com",
        accountNumbers: ["account-1"],
        tokenExpirationSource: "provider",
      },
      getDxFeedPropFirmByHistoricalHost("https://volumetrica.miltraders.com")!,
    );

    expect(migrated).toMatchObject({
      propFirmId: "miltraders",
      propfirmName: "Miltraders",
      accountNumbers: ["account-1"],
      tokenExpirationSource: "provider",
    });
  });
});
