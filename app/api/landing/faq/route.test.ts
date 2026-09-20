import { describe, expect, it } from "vitest";
import enFaq from "@/locales/en/faq";
import { GET, POST } from "./route";

const FAQ_URL = "http://localhost/api/landing/faq";

function post(body: unknown) {
  return POST(
    new Request(FAQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/landing/faq", () => {
  it("answers a published FAQ question from the locale files", async () => {
    const response = await post({
      question: "Does Deltalytix trade for me?",
      locale: "en",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = await response.json();
    expect(body.source).toBe("faq");
    expect(body.answer).toBe(enFaq.faq.answer1);
  });

  it("defaults an unknown locale to English", async () => {
    const response = await post({
      question: "How do I get the latest version?",
      locale: "de",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.answer).toBe(enFaq.faq.answer4);
  });

  it("rejects an empty question with the shared JSON error envelope", async () => {
    const response = await post({ question: "   ", locale: "en" });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("unprocessable_entity");
    expect(body.error.hint).toContain("non-empty question");
  });

  it("rejects invalid JSON", async () => {
    const response = await post("{");

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("bad_request");
  });
});

describe("GET /api/landing/faq", () => {
  it("answers with method_not_allowed", async () => {
    const response = await GET(
      new Request(FAQ_URL, { method: "GET" }),
    );

    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body.error.code).toBe("method_not_allowed");
  });
});
