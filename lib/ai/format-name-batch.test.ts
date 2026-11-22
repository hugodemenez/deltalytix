import { describe, expect, it } from "vitest"
import { FORMAT_NAME_MAX_BATCH, formatNameBatchError } from "./format-name-batch"

describe("formatNameBatchError", () => {
  it("accepts the default batch and rejects a batch the token cap cannot finish", () => {
    expect(formatNameBatchError(10)).toBeNull()
    expect(formatNameBatchError(FORMAT_NAME_MAX_BATCH)).toBeNull()
    expect(formatNameBatchError(FORMAT_NAME_MAX_BATCH + 1)).toEqual({
      error: "Name inference accepts 1 to 20 emails per request",
      max: 20,
    })
    expect(formatNameBatchError(0)?.max).toBe(20)
  })
})
