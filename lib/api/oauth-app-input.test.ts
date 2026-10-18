import { describe, expect, it } from "vitest"
import {
  OAUTH_APP_ERROR_MESSAGES as M,
  redirectUriErrorMessage,
  validateOAuthAppInput,
} from "./oauth-app-input"

describe("redirectUriErrorMessage", () => {
  it.each([
    ["https://app.example.com/callback", null],
    ["http://localhost:3000/callback", null],
    ["http://127.0.0.1/cb", null],
    ["http://[::1]:8080/cb", null],
    ["http://mytradingbot.app/auth", M.redirectUriHttps],
    ["javascript:alert(1)", M.redirectUriHttps],
    ["/callback", M.redirectUriNotAbsolute],
    ["https://app.example.com/cb#frag", M.redirectUriFragment],
    ["https://user:pass@app.example.com/cb", M.redirectUriCredentials],
  ])("%s", (uri, expected) => {
    expect(redirectUriErrorMessage(uri)).toBe(expected)
  })
})

describe("validateOAuthAppInput create", () => {
  it("normalizes a valid app", () => {
    const result = validateOAuthAppInput(
      {
        name: " Bot ",
        description: " Posts trades ",
        redirectUris: [" https://a.example.com/cb ", "", "https://a.example.com/cb", "http://localhost:3000/cb"],
        scopes: ["trades:read", "trades:read", "metrics:read"],
      },
      "create",
    )
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Bot",
        description: "Posts trades",
        redirectUris: ["https://a.example.com/cb", "http://localhost:3000/cb"],
        scopes: ["trades:read", "metrics:read"],
      },
    })
  })

  it("requires name, a redirect URI and a scope", () => {
    const result = validateOAuthAppInput({}, "create")
    expect(result).toEqual({
      ok: false,
      errors: [
        { field: "name", message: M.nameRequired },
        { field: "redirectUris", message: M.redirectUriRequired },
        { field: "scopes", message: M.scopeRequired },
      ],
    })
  })

  it("reports each bad URI with its index", () => {
    const result = validateOAuthAppInput(
      {
        name: "Bot",
        redirectUris: ["https://ok.example.com/cb", "http://bad.example.com/cb", "https://x.example.com/#a"],
        scopes: ["trades:read"],
      },
      "create",
    )
    expect(result).toEqual({
      ok: false,
      errors: [
        { field: "redirectUris", index: 1, message: M.redirectUriHttps },
        { field: "redirectUris", index: 2, message: M.redirectUriFragment },
      ],
    })
  })

  it("rejects unknown scopes instead of dropping them", () => {
    const result = validateOAuthAppInput(
      { name: "Bot", redirectUris: ["https://a.example.com/cb"], scopes: ["trades:read", "admin"] },
      "create",
    )
    expect(result).toEqual({ ok: false, errors: [{ field: "scopes", message: M.scopeUnknown }] })
  })

  it("enforces length limits", () => {
    const result = validateOAuthAppInput(
      {
        name: "x".repeat(81),
        description: "y".repeat(301),
        redirectUris: ["https://a.example.com/cb"],
        scopes: ["trades:read"],
      },
      "create",
    )
    expect(result).toEqual({
      ok: false,
      errors: [
        { field: "name", message: M.nameTooLong },
        { field: "description", message: M.descriptionTooLong },
      ],
    })
  })

  it("caps redirect URIs", () => {
    const uris = Array.from({ length: 11 }, (_, i) => `https://a.example.com/cb${i}`)
    const result = validateOAuthAppInput(
      { name: "Bot", redirectUris: uris, scopes: ["trades:read"] },
      "create",
    )
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "redirectUris", message: M.tooManyRedirectUris }],
    })
  })
})

describe("validateOAuthAppInput update", () => {
  it("only validates present fields", () => {
    expect(validateOAuthAppInput({ name: "New name" }, "update")).toEqual({
      ok: true,
      value: { name: "New name" },
    })
  })

  it("lets description be cleared", () => {
    expect(validateOAuthAppInput({ description: null }, "update")).toEqual({
      ok: true,
      value: { description: null },
    })
  })

  it("rejects an empty patch", () => {
    expect(validateOAuthAppInput({}, "update")).toEqual({
      ok: false,
      errors: [{ field: "form", message: M.nothingToUpdate }],
    })
  })

  it("rejects an empty URI list", () => {
    expect(validateOAuthAppInput({ redirectUris: [] }, "update")).toEqual({
      ok: false,
      errors: [{ field: "redirectUris", message: M.redirectUriRequired }],
    })
  })
})
