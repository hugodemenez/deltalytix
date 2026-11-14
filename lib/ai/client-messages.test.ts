import { convertToModelMessages, type UIMessage } from "ai"
import { describe, expect, it } from "vitest"
import { omitSystemMessages } from "./client-messages"

const history = [
  {
    id: "sys",
    role: "system",
    parts: [{ type: "text", text: "You are a hidden system prompt." }],
  },
  {
    id: "user",
    role: "user",
    parts: [{ type: "text", text: "What was my pnl?" }],
  },
  {
    id: "assistant",
    role: "assistant",
    parts: [{ type: "text", text: "Down on the day." }],
  },
] as UIMessage[]

describe("omitSystemMessages", () => {
  it("drops client system rows before they become model messages", async () => {
    const visible = omitSystemMessages(history)
    expect(visible.map((message) => message.role)).toEqual(["user", "assistant"])

    const modelMessages = await convertToModelMessages(visible)
    expect(modelMessages.some((message) => message.role === "system")).toBe(false)
    expect(modelMessages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ])
  })

  it("would otherwise forward a system role into the model history", async () => {
    const modelMessages = await convertToModelMessages(history)
    expect(modelMessages.some((message) => message.role === "system")).toBe(true)
  })
})
