import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { AuthorizeConsent } from "./consent"

vi.mock("./actions", () => ({
  approveAuthorizationAction: vi.fn(),
  denyAuthorizationAction: vi.fn(),
  switchAccountAction: vi.fn(),
}))

describe("AuthorizeConsent", () => {
  it("renders the proof copy, text wordmark, and write tag", () => {
    const html = renderToStaticMarkup(
      <AuthorizeConsent
        email="hugo@example.com"
        app={{
          id: "app-1",
          name: "My trading bot",
          description: null,
          logoUrl: null,
          clientId: "dltx_app_example",
        }}
        scopes={[
          { id: "trades:read", description: "Read your trades" },
          { id: "accounts:read", description: "Read your trading accounts" },
          { id: "trades:write", description: "Create and import trades" },
        ]}
        redirectUri="https://mytradingbot.app/callback"
        scopeValue="trades:read accounts:read trades:write"
      />,
    )

    expect(html).toContain("Deltalytix")
    expect(html).toContain("My trading bot wants to access your Deltalytix account")
    expect(html).toContain("Signed in as hugo@example.com")
    expect(html).toContain("It will be able to")
    expect(html).toContain("Read your trades")
    expect(html).toContain("Create and import trades")
    expect(html).toContain("Can change data")
    expect(html).toContain("It can’t see your password. You can disconnect it anytime in Settings.")
    expect(html).toContain("Cancel")
    expect(html).toContain("Allow")
    expect(html).toContain("You’ll be sent back to")
    expect(html).toContain("mytradingbot.app")
    expect(html).not.toContain("<img")
  })

  it("offers to switch account, in French when the locale is fr", () => {
    const props = {
      email: "hugo@example.com",
      app: { id: "a", name: "Bot", description: null, logoUrl: null, clientId: "c" },
      scopes: [],
      redirectUri: "https://bot.app/cb",
      scopeValue: "",
      switchAccountNext: "oauth/authorize?client_id=c&state=xyz",
    }
    const en = renderToStaticMarkup(<AuthorizeConsent {...props} />)
    expect(en).toContain("Use another account")
    expect(en).toContain('value="oauth/authorize?client_id=c&amp;state=xyz"')
    const fr = renderToStaticMarkup(<AuthorizeConsent {...props} locale="fr" />)
    expect(fr).toContain("Changer de compte")
  })
})
