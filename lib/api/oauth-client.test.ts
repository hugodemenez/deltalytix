import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { sha256 } from "./tokens"
import {
  clientSecretSatisfies,
  InvalidOAuthRequestBody,
  parseBasicClientAuth,
  readOAuthFormOrJson,
  resolveClientCredentials,
} from "./oauth-client"

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

describe("clientSecretSatisfies", () => {
  const hash = sha256("dltx_secret_xyz")

  it("accepts only the matching secret", () => {
    expect(clientSecretSatisfies(hash, "dltx_secret_xyz")).toBe(true)
  })

  it("rejects a missing, empty, or wrong secret", () => {
    expect(clientSecretSatisfies(hash, undefined)).toBe(false)
    expect(clientSecretSatisfies(hash, "")).toBe(false)
    expect(clientSecretSatisfies(hash, "wrong")).toBe(false)
  })
})

describe("readOAuthFormOrJson", () => {
  function post(body: string, contentType: string) {
    return new NextRequest("https://example.test/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
    })
  }

  it("parses JSON and form bodies into strings", async () => {
    await expect(
      readOAuthFormOrJson(post('{"grant_type":"refresh_token","n":1}', "application/json")),
    ).resolves.toEqual({ grant_type: "refresh_token", n: "1" })
    await expect(
      readOAuthFormOrJson(
        post("grant_type=authorization_code", "application/x-www-form-urlencoded"),
      ),
    ).resolves.toEqual({ grant_type: "authorization_code" })
  })

  it("throws InvalidOAuthRequestBody for malformed or non-object JSON", async () => {
    await expect(
      readOAuthFormOrJson(post("{not json", "application/json")),
    ).rejects.toBeInstanceOf(InvalidOAuthRequestBody)
    await expect(
      readOAuthFormOrJson(post("[1,2]", "application/json")),
    ).rejects.toBeInstanceOf(InvalidOAuthRequestBody)
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
