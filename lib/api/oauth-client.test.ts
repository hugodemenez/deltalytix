import { describe, expect, it } from "vitest"
import { parseBasicClientAuth, resolveClientCredentials } from "./oauth-client"

describe("parseBasicClientAuth", () => {
  it("decodes RFC 6749 client_secret_basic credentials", () => {
    const encoded = Buffer.from("dltx_app_abc:dltx_secret_xyz", "utf8").toString(
      "base64",
    )

    expect(parseBasicClientAuth(`Basic ${encoded}`)).toEqual({
      clientId: "dltx_app_abc",
      clientSecret: "dltx_secret_xyz",
    })
  })

  it("url-decodes reserved characters in the id and secret", () => {
    const encoded = Buffer.from("app%3Aid:sec%3Aret", "utf8").toString("base64")

    expect(parseBasicClientAuth(`Basic ${encoded}`)).toEqual({
      clientId: "app:id",
      clientSecret: "sec:ret",
    })
  })

  it("rejects missing, bearer, or malformed headers", () => {
    expect(parseBasicClientAuth(null)).toBeNull()
    expect(parseBasicClientAuth("Bearer dltx_at_abc")).toBeNull()
    expect(parseBasicClientAuth("Basic not-base64")).toBeNull()
    expect(
      parseBasicClientAuth(`Basic ${Buffer.from("nocolon", "utf8").toString("base64")}`),
    ).toBeNull()
  })
})

describe("resolveClientCredentials", () => {
  it("prefers the Basic header over body fields", () => {
    const encoded = Buffer.from("header-id:header-secret", "utf8").toString(
      "base64",
    )
    const request = new Request("https://example.test/token", {
      headers: { Authorization: `Basic ${encoded}` },
    })

    expect(
      resolveClientCredentials(request, {
        client_id: "body-id",
        client_secret: "body-secret",
      }),
    ).toEqual({
      clientId: "header-id",
      clientSecret: "header-secret",
    })
  })

  it("falls back to client_secret_post body fields", () => {
    const request = new Request("https://example.test/token")

    expect(
      resolveClientCredentials(request, {
        client_id: "body-id",
        client_secret: "body-secret",
      }),
    ).toEqual({
      clientId: "body-id",
      clientSecret: "body-secret",
    })
  })
})
