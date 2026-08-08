import { afterEach, describe, expect, it } from "vitest"

import { isAuthorizedCronRequest } from "./cron-auth"

const ORIGINAL_SECRET = process.env.CRON_SECRET

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.CRON_SECRET
  } else {
    process.env.CRON_SECRET = ORIGINAL_SECRET
  }
})

describe("isAuthorizedCronRequest", () => {
  it("accepts the configured secret", () => {
    process.env.CRON_SECRET = "s3cret-value"
    expect(isAuthorizedCronRequest("Bearer s3cret-value")).toBe(true)
  })

  it.each([
    "Bearer wrong-value",
    "bearer s3cret-value",
    "s3cret-value",
    "Bearer s3cret-value ",
    "",
  ])("rejects %s", (header) => {
    process.env.CRON_SECRET = "s3cret-value"
    expect(isAuthorizedCronRequest(header)).toBe(false)
  })

  it.each([null, undefined])("rejects a missing header (%s)", (header) => {
    process.env.CRON_SECRET = "s3cret-value"
    expect(isAuthorizedCronRequest(header)).toBe(false)
  })

  // The template-literal comparison this replaces would have accepted
  // "Bearer undefined" from any caller once the variable was unset.
  it.each(["Bearer undefined", "Bearer ", "Bearer null", ""])(
    "refuses %s when no secret is configured",
    (header) => {
      delete process.env.CRON_SECRET
      expect(isAuthorizedCronRequest(header)).toBe(false)
    },
  )

  it("refuses a correct-looking header when the secret is empty", () => {
    process.env.CRON_SECRET = ""
    expect(isAuthorizedCronRequest("Bearer ")).toBe(false)
  })
})
