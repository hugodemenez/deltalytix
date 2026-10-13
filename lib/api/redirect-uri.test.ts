import { describe, expect, it } from "vitest"
import { redirectUriProblem } from "./redirect-uri"

describe("redirectUriProblem", () => {
  it("accepts https and loopback http URIs", () => {
    expect(redirectUriProblem("https://app.example/callback")).toBeNull()
    expect(redirectUriProblem("https://app.example/cb?tenant=1")).toBeNull()
    expect(redirectUriProblem("http://localhost:3000/callback")).toBeNull()
    expect(redirectUriProblem("http://127.0.0.1:8080/cb")).toBeNull()
    expect(redirectUriProblem("http://[::1]:8080/cb")).toBeNull()
  })

  it("rejects script, data, and other non-http schemes", () => {
    expect(redirectUriProblem("javascript:alert(1)")).not.toBeNull()
    expect(redirectUriProblem("data:text/html,hi")).not.toBeNull()
    expect(redirectUriProblem("ftp://app.example/cb")).not.toBeNull()
  })

  it("rejects relative URIs, cleartext http off loopback, fragments, and credentials", () => {
    expect(redirectUriProblem("/callback")).not.toBeNull()
    expect(redirectUriProblem("http://app.example/callback")).not.toBeNull()
    expect(redirectUriProblem("https://app.example/cb#frag")).not.toBeNull()
    expect(redirectUriProblem("https://app.example/cb#")).not.toBeNull()
    expect(redirectUriProblem("https://user:pass@app.example/cb")).not.toBeNull()
  })
})
