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
        resource="https://www.deltalytix.app/api/mcp"
        switchAccountNext="oauth/authorize?client_id=dltx_app_example"
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
    expect(html).toContain('name="resource"')
    expect(html).toContain("https://www.deltalytix.app/api/mcp")
    expect(html).toContain("Use another account")
    expect(html).not.toContain("Unverified app")
    expect(html).not.toContain("<img")
  })

  it("warns when the client was dynamically registered, in English and French", () => {
    const props = {
      email: "hugo@example.com",
      app: {
        id: "app-1",
        name: "MCP Inspector",
        description: null,
        logoUrl: null,
        clientId: "dltx_app_example",
        dynamicallyRegistered: true,
      },
      scopes: [{ id: "trades:read", description: "Read your trades" }],
      redirectUri: "http://127.0.0.1:6276/oauth/callback",
      scopeValue: "trades:read",
    }
    const en = renderToStaticMarkup(<AuthorizeConsent {...props} />)
    expect(en).toContain("Unverified app")
    expect(en).toContain("Deltalytix hasn’t reviewed this app.")
    expect(en).toContain("127.0.0.1:6276")

    const fr = renderToStaticMarkup(<AuthorizeConsent {...props} locale="fr" />)
    expect(fr).toContain("Application non vérifiée")
    expect(fr).toContain("Deltalytix n’a pas examiné cette application.")
    expect(fr).toContain("127.0.0.1:6276")
    expect(fr).not.toContain("Unverified app")
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
