import { describe, expect, it } from "vitest";
import { GET } from "./route";

const TOKEN = "pMq3Z0R4VSscEzHBWiqgI526bED1-4Paipfi6Y94g9g";

describe("GET /.well-known/openai-apps-challenge", () => {
  it("returns the OpenAI domain verification token as plain text", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(await response.text()).toBe(TOKEN);
  });
});
